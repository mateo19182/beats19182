#!/usr/bin/env python3
import os
import re
import json
import argparse
import shutil

def load_name_tags_mapping(json_file):
    """
    Load the name and tags mapping from JSON file.
    
    Args:
        json_file (str): Path to the JSON file with name and tags mapping.
        
    Returns:
        dict: A dictionary with filenames as keys and lists of tags as values.
    """
    try:
        with open(json_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Create a mapping of filenames to tags
        name_to_tags = {}
        for item in data:
            filename = item.get('filename', '').strip().lower()
            tags = item.get('tags', [])
            if filename:
                name_to_tags[filename] = tags
                
        return name_to_tags
    
    except Exception as e:
        print(f"Error loading name-tags mapping: {e}")
        return {}

def rename_files(input_directory, output_directory, name_tags_mapping):
    """
    Rename audio files from the input directory, removing prefixes and tags,
    then adding tags from the mapping, and saving to the output directory.
    
    Args:
        input_directory (str): Path to the directory containing original audio files.
        output_directory (str): Path to save renamed audio files.
        name_tags_mapping (dict): Mapping of filenames to tags.
    """
    # Supported audio extensions
    audio_extensions = ('.mp3', '.wav', '.m4a')
    
    # Regular expression to extract the base name (without prefix and tags)
    prefix_pattern = r'^mateo_19182 - '
    bpm_tag_pattern = r' \[\d+ bpm\]'
    # Pattern for any tag in square brackets
    any_tag_pattern = r' \[[^\]]+\]'
    # Comprehensive key/tonality pattern that catches variations like [A# Bb Major], [F# Gb Minor], etc.
    key_tag_pattern = r' \[[A-G](#|b)?(/[A-G](#|b)?)?\s*(Major|Minor|Maj|Min)\]'
    
    # Create output directory if it doesn't exist
    os.makedirs(output_directory, exist_ok=True)
    
    rename_count = 0
    error_count = 0
    
    print(f"Processing files from {input_directory} to {output_directory}")
    
    for filename in os.listdir(input_directory):
        input_path = os.path.join(input_directory, filename)
        
        # Skip if not a file or not an audio file
        if not os.path.isfile(input_path) or not filename.lower().endswith(audio_extensions):
            continue
        
        try:
            # Keep a copy of the original name for reporting
            original_name = filename
            
            # Remove the prefix "mateo_19182 - "
            clean_name = re.sub(prefix_pattern, '', filename, flags=re.IGNORECASE)
            
            # First remove BPM and key tags
            clean_name = re.sub(bpm_tag_pattern, '', clean_name)
            clean_name = re.sub(key_tag_pattern, '', clean_name)
            
            # Now remove any remaining tags in square brackets
            clean_name = re.sub(any_tag_pattern, '', clean_name)
            
            # Get the base name without extension
            base_name, extension = os.path.splitext(clean_name)
            base_name = base_name.strip()
            
            # Look for tag matches
            tags = []
            # First try direct match
            if base_name.lower() in name_tags_mapping:
                tags = name_tags_mapping[base_name.lower()]
            else:
                # Try partial match by iterating through keys
                # This is less efficient but more flexible
                for key, value in name_tags_mapping.items():
                    # Check if the cleaned name contains the key or vice versa
                    if key.lower() in base_name.lower() or base_name.lower() in key.lower():
                        tags = value
                        print(f"Partial match found: '{base_name}' ↔ '{key}'")
                        break
            
            # Add tags to filename
            if tags:
                tag_string = ' '.join(f"[{tag}]" for tag in tags)
                new_filename = f"{base_name} {tag_string}{extension}"
            else:
                new_filename = f"{base_name}{extension}"
                print(f"No tags found for: {base_name}")
            
            # Save to output directory with new name
            output_path = os.path.join(output_directory, new_filename)
            shutil.copy2(input_path, output_path)
            print(f"Processed: {original_name} → {new_filename}")
            rename_count += 1
        
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            error_count += 1
    
    print(f"\nProcessed {rename_count} files. Encountered {error_count} errors.")

def main():
    parser = argparse.ArgumentParser(description='Rename audio files by removing prefix and adding tags from mapping.')
    parser.add_argument('input_directory', help='Directory containing audio files to process')
    parser.add_argument('--output-directory', default=None, help='Directory to save processed files (defaults to input_directory + "_processed")')
    parser.add_argument('--tags-file', default=None, help='Path to the JSON file with name-tags mapping')
    
    args = parser.parse_args()
    
    # If output_directory not specified, create a default one
    if args.output_directory is None:
        args.output_directory = args.input_directory + "_processed"
    
    # If tags_file not specified, use default
    if args.tags_file is None:
        script_dir = os.path.dirname(os.path.realpath(__file__))
        args.tags_file = os.path.join(script_dir, "offtop_name_tags.json")
    
    if not os.path.exists(args.input_directory):
        print(f"Error: Input directory '{args.input_directory}' not found.")
        return
    
    if not os.path.exists(args.tags_file):
        print(f"Error: Tags file '{args.tags_file}' not found.")
        return
    
    # Load name-tags mapping
    name_tags_mapping = load_name_tags_mapping(args.tags_file)
    if not name_tags_mapping:
        print("Error: Failed to load name-tags mapping.")
        return
    
    # Process the files
    rename_files(args.input_directory, args.output_directory, name_tags_mapping)

if __name__ == "__main__":
    main() 