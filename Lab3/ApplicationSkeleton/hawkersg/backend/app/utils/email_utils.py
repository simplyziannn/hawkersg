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
    <html>
        <body>
            <p>Hi {username},</p> 
            <p>You recently requested to reset the password for your HawkerSG account.</p>
            <p>Please click the button below to reset your password:</p>
            <p><a href="{reset_url}" style="background-color: #dc2626; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a></p>
            <p>This link will expire in 1 hour. If you did not request a password reset, please ignore this email.</p>
            <p>Thanks,<br>The HawkerSG Team</p>
        </body>
    </html>
    """
    
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
