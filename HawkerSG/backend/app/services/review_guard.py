from typing import TypedDict, Literal, Optional
import os, re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
client = None

CLASSIFIER_MODEL = os.getenv("OPENAI_CLASSIFIER_MODEL", "gpt-4o-mini")

# Set True in prod to block if LLM call fails
FAIL_CLOSED = True

class GuardVerdict(TypedDict, total=False):
    ok: bool
    reason: Optional[str]
    code: Literal["ok", "blocked_moderation", "blocked_rude", "blocked_length", "llm_error"]

BOUNCE_MSG = (
    "Your review was rejected because it violates our content rules. "
    "Please keep feedback respectful and constructive (e.g., describe what went wrong and how it could improve)."
)

# super small local rude net
_PROFANITY = [r"\bdogshit\b", r"\btrash\b", r"\bshit\b", r"\bfuck\b", r"\bidiot\b", r"\bwtf\b", r"\bgarbage\b"]
_PROFANITY_RE = re.compile("|".join(_PROFANITY), flags=re.IGNORECASE)

LABEL_RE = re.compile(r"\b(CONSTRUCTIVE|NON_CONSTRUCTIVE_RUDE|POLICY_VIOLATION|OTHER)\b", re.I)

def _trim(s: Optional[str]) -> str:
    return (s or "").strip()

def _local_rude(text: str) -> bool:
    if _PROFANITY_RE.search(text):
        short = len(text) < 40
        lacks_detail = not re.search(
            r"\b(too|very|because|since|cold|late|price|service|clean|salty|sweet|spicy|portion|wait|slow|raw|undercooked|burnt|oily|greasy|staff|hygiene|taste|fresh)\b",
            text,
            re.IGNORECASE,
        )
        return short or lacks_detail
    return False

def _extract_text_from_responses(resp) -> str:
    # Works across client versions
    txt = getattr(resp, "output_text", None)
    if isinstance(txt, str) and txt.strip():
        return txt.strip()

    out = []
    for item in getattr(resp, "output", []) or []:
        for c in getattr(item, "content", []) or []:
            if hasattr(c, "text") and isinstance(c.text, str):
                out.append(c.text)
    return "".join(out).strip()

def guard_review_text(description: Optional[str]) -> GuardVerdict:
    """
    Single prompt guard (no Moderations API / no structured outputs).
    Blocks POLICY_VIOLATION or NON_CONSTRUCTIVE_RUDE.
    """
    text = _trim(description)
    if not text:
        return {"ok": True, "code": "ok"}
    if len(text) > 4000:
        return {"ok": False, "code": "blocked_length", "reason": "Review is too long."}

    # 0) local quick net
    if _local_rude(text):
        return {"ok": False, "code": "blocked_rude", "reason": BOUNCE_MSG}

    try:
        resp = client.responses.create(
            model=CLASSIFIER_MODEL,
            temperature=0,
            # Put both “system” instruction and user text into the input list — works on old clients
            input=[
                {
                    "role": "system",
                    "content": (
                        "Classify the user's review. Respond with EXACTLY ONE of these labels and nothing else:\n"
                        "CONSTRUCTIVE, NON_CONSTRUCTIVE_RUDE, POLICY_VIOLATION, OTHER.\n"
                        "Definitions:\n"
                        "- CONSTRUCTIVE: mentions specific issues/observations/reasons/suggestions (even if negative).\n"
                        "- NON_CONSTRUCTIVE_RUDE: insulting/profanity-only/purely derogatory with no specifics "
                        "(e.g., 'dogshit food', 'trash place').\n"
                        "- POLICY_VIOLATION: hateful/harassing/sexual content involving minors/violent threats/self-harm "
                        "instructions/graphic violence or other clearly unsafe content.\n"
                        "- OTHER: anything else.\n"
                        "Output MUST be only the single label token, no extra words."
                    ),
                },
                {"role": "user", "content": f"Review: {text}"},
            ],
        )

        out_text = _extract_text_from_responses(resp)
        m = LABEL_RE.search(out_text or "")
        label = (m.group(1) if m else "OTHER").upper()

        if label == "POLICY_VIOLATION":
            return {"ok": False, "code": "blocked_moderation", "reason": BOUNCE_MSG}
        if label == "NON_CONSTRUCTIVE_RUDE":
            return {"ok": False, "code": "blocked_rude", "reason": BOUNCE_MSG}
        return {"ok": True, "code": "ok"}

    except Exception as e:
        print(f"[review_guard] LLM check error: {e}")
        if FAIL_CLOSED:
            return {"ok": False, "code": "llm_error", "reason": BOUNCE_MSG}
        return {"ok": True, "code": "ok"}
