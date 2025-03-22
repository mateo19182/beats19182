#!/usr/bin/env python3
import json
import os
import re

def extract_name_and_tags(input_file, output_file):
    """
    Extracts the name and tags from each entry in the offtop_tags.txt file
    and outputs a simplified JSON with only that information.
    
    Args:
        input_file (str): Path to the offtop_tags.txt file.
        output_file (str): Path to save the output JSON file.
    """
    print(f"Reading from {input_file}...")
    
    try:
        # Read the content of the file
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse the content by finding all JSON arrays
        # We'll combine the arrays by replacing '][\n' with ','
        cleaned_content = re.sub(r'\]\s*\[\s*', ',', content)
        
        # Make sure it starts with [ and ends with ]
        if not cleaned_content.strip().startswith('['):
            cleaned_content = '[' + cleaned_content
        if not cleaned_content.strip().endswith(']'):
            cleaned_content = cleaned_content + ']'
        
        # Parse the cleaned JSON
        data = json.loads(cleaned_content)
        
        # Create a new list with only name and tags
        simplified_data = []
        for item in data:
            # Extract the name and tags
            name = item.get('name', '')
            tags = item.get('tags', [])
            
            # Add to the simplified list
            simplified_data.append({
                'filename': name,
                'tags': tags
            })
        
        # Write the simplified data to the output file
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(simplified_data, f, indent=2)
        
        print(f"Successfully extracted data for {len(simplified_data)} entries.")
        print(f"Output saved to {output_file}")
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}")
        print("This may be caused by malformed JSON in the input file.")
    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    # Define input and output file paths
    script_dir = os.path.dirname(os.path.realpath(__file__))
    input_file = os.path.join(script_dir, "offtop_tags.txt")
    output_file = os.path.join(script_dir, "offtop_name_tags.json")
    
    # Run the extraction
    extract_name_and_tags(input_file, output_file) 