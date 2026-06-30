from dotenv import load_dotenv
load_dotenv()

from classifier import classify_email

sender = "no-reply@seatgeek.com"
subject = "Thank you for applying to SeatGeek"
body = """Hi Clark,

Thanks for your interest in joining SeatGeek! Your application for the Software Engineer - New Grad role has been received, and our team will be in touch once we've had a chance to review your application.

Please note that we are working diligently to review a high volume of applications, and we sincerely appreciate your patience.

In the meantime, check us out on BuiltIn, Instagram, LinkedIn, and Glassdoor.

Cheers,
The SG Team"""

result = classify_email(sender, subject, body)
print(result)
