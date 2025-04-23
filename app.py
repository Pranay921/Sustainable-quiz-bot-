# Import the Flask app from chatbot.py
from chatbot import app

# This file is needed for Render deployment
# The app variable is imported from chatbot.py and exposed here
# so Gunicorn can find it

if __name__ == '__main__':
    # This won't be used by Gunicorn, but allows for local testing
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)