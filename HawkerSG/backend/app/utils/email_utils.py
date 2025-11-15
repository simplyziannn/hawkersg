import uuid
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

# Load environment variables from the .env file
load_dotenv()

# Access Environment variables
SENDGRID_API_KEY = os.environ.get("SENDGRID_API_KEY")
SENDGRID_SENDER_EMAIL = os.environ.get("SENDGRID_SENDER_EMAIL")
FRONTEND_URL = os.environ.get("FRONTEND_URL")

def generate_reset_token() -> str:
    """Generates a secure, unique token for password reset."""
    return str(uuid.uuid4())

def get_token_expiration() -> datetime:
    """Calculates the expiration time for the token (1 hour from now)."""
    return datetime.now() + timedelta(hours=1)

def send_password_reset_email(email: str, token: str, username: str):
    """
    Sends a password reset email using the SendGrid API, including the user's name.
    """
    if not all([SENDGRID_API_KEY, SENDGRID_SENDER_EMAIL, FRONTEND_URL]):
        print("ERROR: SendGrid configuration missing. Check your .env file.")
        return

    reset_url = f"{FRONTEND_URL}/reset-password?token={token}"
    
    subject = "HawkerSG Password Reset Request"
    
    html_content = f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            body {{
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol';
                background-color: #f7f7f7;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 30px auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
                overflow: hidden;
            }}
            .header {{
                background-color: #dc2626; /* HawkerSG theme color */
                color: #ffffff;
                padding: 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 24px;
            }}
            .content {{
                padding: 30px;
                line-height: 1.6;
                color: #333333;
            }}
            .button-container {{
                text-align: center;
                margin: 25px 0;
            }}
            .reset-button {{
                background-color: #dc2626;
                color: white !important;
                padding: 12px 25px;
                text-decoration: none;
                border-radius: 6px;
                font-weight: bold;
                display: inline-block;
                border: 1px solid #c21a1a;
            }}
            .note {{
                color: #777777;
                font-size: 14px;
                border-top: 1px solid #eeeeee;
                padding-top: 20px;
                margin-top: 20px;
            }}
            .footer {{
                background-color: #f0f0f0;
                color: #aaaaaa;
                text-align: center;
                padding: 15px;
                font-size: 12px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>HawkerSG</h1>
            </div>
            <div class="content">
                <p>Hi **{username}**, </p>
                <p>You recently requested to reset the password for your **HawkerSG** account. We're here to help you get back in!</p>

                <div class="button-container">
                    <a href="{reset_url}" class="reset-button">Reset Password</a>
                </div>

                <p>For security, this link will **expire in 1 hour**. Please complete the reset process soon.</p>

                <div class="note">
                    <p>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                </div>
            </div>
            <div class="footer">
                &copy; {datetime.now().year} HawkerSG Team. All rights reserved.<br>
                Singapore, SG
            </div>
        </div>
    </body>
    </html>
    """
    # --- END UPDATED HTML CONTENT ---
    
    message = Mail(
        from_email=SENDGRID_SENDER_EMAIL,
        to_emails=email,
        subject=subject,
        html_content=html_content
    )

    try:
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code in [200, 202]:
            print(f"Successfully initiated SendGrid email to {email}. Status: {response.status_code}")
        else:
            print(f"SendGrid Error sending email to {email}. Status: {response.status_code}. Body: {response.body}")

    except Exception as e:
        print(f"FATAL ERROR: SendGrid API call failed. Error: {e}")
