#!/usr/bin/env python3
import os
import sys
import argparse
import requests
import json
from pathlib import Path
from tqdm import tqdm
import pickle

# Create a session that will be used for all requests
session = requests.Session()

def login(api_base_url, email, password):
    """
    Login to the service and get the authentication token
    
    Args:
        api_base_url (str): Base URL of the API
        email (str): User email
        password (str): User password
        
    Returns:
        str: Session token if successful, None otherwise
    """
    try:
        # First try the NextAuth flow
        token = login_nextauth(api_base_url, email, password)
        if token:
            return token
            
        # If that fails, try the direct login
        print("NextAuth flow failed, trying direct login...")
        token = login_direct(api_base_url, email, password)
        return token
            
    except Exception as e:
        print(f"Error during authentication: {str(e)}")
        return None
        
def login_nextauth(api_base_url, email, password):
    """NextAuth authentication flow"""
    try:
        # Construct signin API URL for NextAuth
        csrf_url = f"{api_base_url}/api/auth/csrf"
        signin_url = f"{api_base_url}/api/auth/signin/credentials"
        callback_url = f"{api_base_url}/api/auth/callback/credentials"
        
        # Get CSRF token first
        csrf_response = session.get(csrf_url)
        if csrf_response.status_code != 200:
            print(f"Failed to get CSRF token: {csrf_response.status_code}")
            return None
            
        csrf_data = csrf_response.json()
        csrf_token = csrf_data.get('csrfToken')
        
        if not csrf_token:
            print("No CSRF token found in response")
            return None
            
        # Create login payload with CSRF token
        login_data = {
            "email": email,
            "password": password,
            "redirect": "false",
            "csrfToken": csrf_token,
            "callbackUrl": api_base_url,
            "json": "true"
        }
        
        # Make initial signin request
        signin_response = session.post(signin_url, data=login_data)
        
        if signin_response.status_code != 200:
            print(f"Initial signin failed: {signin_response.status_code}")
            return None
        
        # Now make the callback request (cookies are handled by the session)
        callback_response = session.post(callback_url, data=login_data)
        
        # Check if authentication was successful
        if callback_response.status_code == 200:
            # Find the session token in the cookies
            for cookie_name, cookie_value in session.cookies.items():
                if 'next-auth.session-token' in cookie_name:
                    print("Authentication successful")
                    return cookie_value
                    
            print("No session token found in response cookies")
            return None
        else:
            print(f"Authentication callback failed: {callback_response.status_code} - {callback_response.text}")
            return None
            
    except Exception as e:
        print(f"Error during NextAuth flow: {str(e)}")
        return None

def login_direct(api_base_url, email, password):
    """Direct login using the credentials provider"""
    try:
        # Try a direct login to the credentials endpoint
        auth_url = f"{api_base_url}/api/auth/callback/credentials"
        
        # Create login payload
        login_data = {
            "email": email,
            "password": password,
            "redirect": "false",
            "callbackUrl": api_base_url
        }
        
        # Send login request
        response = session.post(auth_url, data=login_data, allow_redirects=True)
        
        # Look for session token in cookies
        for cookie_name, cookie_value in session.cookies.items():
            if 'next-auth.session-token' in cookie_name:
                print("Direct authentication successful")
                return cookie_value
        
        print(f"Direct authentication failed: {response.status_code}")
        return None
        
    except Exception as e:
        print(f"Error during direct authentication: {str(e)}")
        return None

def upload_file(file_path, api_url, headers=None):
    """
    Upload a single file to the service API
    
    Args:
        file_path (str): Path to the file to upload
        api_url (str): URL of the upload API endpoint
        headers (dict, optional): Headers to include in the request
        
    Returns:
        dict: Response from the API
    """
    try:
        filename = os.path.basename(file_path)
        
        # Create form data with file and any extracted tags from filename
        files = {'file': (filename, open(file_path, 'rb'), 'audio/mpeg')}
        
        # Extract tags from filename
        tags = []
        import re
        tag_matches = re.findall(r'\[([^\]]+)\]', filename)
        for tag in tag_matches:
            # Add each tag to the form data
            tags.append(tag)
        
        # For debugging
        print(f"Uploading {filename} with tags: {tags}")
        
        # Send POST request to API with proper multipart form handling for arrays
        # Use the session that already has cookies set
        response = session.post(
            api_url, 
            files=files, 
            data=[(f'tags', tag) for tag in tags],  # This format sends multiple 'tags' fields
            headers=headers
        )
        
        # Check if successful
        if response.status_code == 200 or response.status_code == 201:
            result = response.json()
            print(f"Successfully uploaded {filename}")
            return result
        else:
            print(f"Failed to upload {filename}: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Error uploading {file_path}: {str(e)}")
        return None

def upload_directory(directory_path, api_url, headers=None):
    """
    Upload all audio files in a directory to the service API
    
    Args:
        directory_path (str): Path to directory containing audio files
        api_url (str): URL of the upload API endpoint
        headers (dict, optional): Headers to include in the request
        
    Returns:
        tuple: (success_count, error_count)
    """
    # Get list of audio files
    audio_extensions = ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac']
    audio_files = []
    
    for root, _, files in os.walk(directory_path):
        for file in files:
            if any(file.lower().endswith(ext) for ext in audio_extensions):
                audio_files.append(os.path.join(root, file))
    
    print(f"Found {len(audio_files)} audio files to upload")
    
    success_count = 0
    error_count = 0
    
    # Upload each file with progress bar
    for file_path in tqdm(audio_files, desc="Uploading files"):
        result = upload_file(file_path, api_url, headers)
        if result:
            success_count += 1
        else:
            error_count += 1
    
    return success_count, error_count

def main():
    parser = argparse.ArgumentParser(description='Upload audio files to service API')
    parser.add_argument('directory', help='Directory containing audio files to upload')
    parser.add_argument('--api-url', default='http://localhost:3001', 
                        help='Base URL of the API (default: http://localhost:3001)')
    parser.add_argument('--email', help='Email for authentication')
    parser.add_argument('--password', help='Password for authentication')
    parser.add_argument('--session-token', help='Authentication session token (if you already have one)')
    parser.add_argument('--save-session', action='store_true', 
                        help='Save the authenticated session for future use')
    parser.add_argument('--load-session', action='store_true', 
                        help='Load a previously saved session')
    
    # Add an epilog with examples
    parser.epilog = '''
Examples:
  # Upload files with email/password authentication
  python upload_to_service.py /path/to/audio/files --email user@example.com --password yourpassword

  # Upload files with existing session token
  python upload_to_service.py /path/to/audio/files --session-token "your-session-token"

  # Upload files to a different API endpoint
  python upload_to_service.py /path/to/audio/files --api-url http://example.com:3000 --email user@example.com --password yourpassword
  
  # Save the session after authentication for future use
  python upload_to_service.py /path/to/audio/files --email user@example.com --password yourpassword --save-session
  
  # Load a previously saved session
  python upload_to_service.py /path/to/audio/files --load-session
'''
    parser.formatter_class = argparse.RawDescriptionHelpFormatter
    
    args = parser.parse_args()
    
    directory_path = args.directory
    api_base_url = args.api_url
    upload_api_url = f"{api_base_url}/api/upload"
    
    if not os.path.exists(directory_path):
        print(f"Error: Directory '{directory_path}' not found.")
        return
    
    # Session file for saving/loading
    session_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.auth_session')
    
    # Set up headers with authentication
    headers = {}
    token = None
    
    # Check if loading a saved session
    if args.load_session and os.path.exists(session_file):
        try:
            print("Loading saved session...")
            with open(session_file, 'rb') as f:
                saved_session = pickle.load(f)
                session.cookies.update(saved_session.cookies)
                # Check if we have a valid token in the session
                for cookie_name, cookie_value in session.cookies.items():
                    if 'next-auth.session-token' in cookie_name:
                        token = cookie_value
                        print("Loaded session token from saved session")
                        break
        except Exception as e:
            print(f"Error loading session: {str(e)}")
    
    # If no token from saved session, try other authentication methods
    if not token:
        # If session token is provided, use it
        if args.session_token:
            token = args.session_token
            # Add it to the session
            session.cookies.set('next-auth.session-token', token, domain=api_base_url.split('//')[1].split(':')[0])
        # Otherwise, try to login
        elif args.email and args.password:
            print(f"Logging in as {args.email}...")
            token = login(api_base_url, args.email, args.password)
            if not token:
                print("Authentication failed. Cannot proceed with uploads.")
                return
        else:
            print("Error: You must provide either a session token, email/password, or load a saved session.")
            parser.print_help()
            return
    
    # No need to manually set the Cookie header as we're using the session
    
    # Save the session if requested
    if args.save_session:
        try:
            print("Saving session for future use...")
            with open(session_file, 'wb') as f:
                pickle.dump(session, f)
            print(f"Session saved to {session_file}")
        except Exception as e:
            print(f"Error saving session: {str(e)}")
    
    # Upload all files in the directory
    success_count, error_count = upload_directory(directory_path, upload_api_url, headers)
    
    print(f"\nUpload summary:")
    print(f"- Successfully uploaded: {success_count} files")
    print(f"- Failed: {error_count} files")

if __name__ == "__main__":
    main() 