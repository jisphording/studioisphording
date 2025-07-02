import re
from PIL import Image
import os

def update_image_dimensions(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract the moodboardFolder constant
        folder_match = re.search(r"const moodboardFolder = '(.*?)';", content)
        moodboard_folder_prefix = folder_match.group(1) if folder_match else '/content/moodboard/'

        # Regex to find the entire array content
        array_content_match = re.search(r"export default \[\s*([\s\S]*?)\s*\]", content)
        if not array_content_match:
            print("Error: Could not find the export default array in the file.")
            return

        array_inner_content = array_content_match.group(1)

        # Regex to find individual object entries
        # This regex is more flexible, allowing for various whitespace and optional width/height
        object_pattern = re.compile(
            r"{\s*name:\s*'(?P<name>.*?)',\s*type:\s*'(?P<type>.*?)',\s*path:\s*(?P<path_expr>.*?)(?:,\s*width:\s*(?P<width>\d+),\s*height:\s*(?P<height>\d+))?\s*}"
        )

        updated_entries = []
        # formatted_entries = [] # This line was causing the NameError, removed as it's not needed here
        for i, match in enumerate(object_pattern.finditer(array_inner_content)):
            original_name = match.group('name')
            item_type = match.group('type')
            path_expr = match.group('path_expr')
            
            # Reconstruct the original path string from the expression
            # This handles moodboardFolder + '...' and direct string literals
            path_str_match = re.search(r"moodboardFolder \+ '(.*?)'", path_expr)
            if path_str_match:
                image_path_suffix = path_str_match.group(1)
            else:
                # Fallback for direct string literals if any exist (though not in current file)
                path_str_match = re.search(r"'(.*?)'", path_expr)
                image_path_suffix = path_str_match.group(1) if path_str_match else ''

            full_image_path = os.path.join('app', 'content', 'moodboard', os.path.basename(image_path_suffix))

            width = 0
            height = 0
            if os.path.exists(full_image_path):
                try:
                    with Image.open(full_image_path) as img:
                        width, height = img.size
                        print(f"Found image: {full_image_path}, Dimensions: {width}x{height}")
                except Exception as e:
                    print(f"Error processing image {full_image_path}: {e}")
            else:
                print(f"Image not found: {full_image_path}")
            
            # Keep the original name, do not change it
            # new_name = f"moodboardImage_{str(i + 1).zfill(4)}" 
            
            # Format the entry exactly as requested, but with original name
            updated_entries.append(
                f"    {{ name: '{original_name}', \n" # Use original_name here
                f"        type: '{item_type}', \n"
                f"        path: {path_expr}, \n"
                f"        width: {width}, \n"
                f"        height: {height} \n"
                f"    }}"
            )

        # Reconstruct the file content with improved formatting
        # Find the part before the array and the part after (if any)
        before_array = content[:array_content_match.start()]
        after_array = content[array_content_match.end():]

        new_array_content_formatted = ",\n".join(updated_entries)
        
        final_content = f"{before_array}export default [\n{new_array_content_formatted}\n]{after_array}"

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(final_content)
            
        print(f"Successfully updated dimensions and formatted {file_path}")

    except FileNotFoundError:
        print(f"Error: The file at {file_path} was not found.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")

if __name__ == "__main__":
    js_file_path = 'dev/js/three/projects/moodboard/World_Sources.mjs'
    update_image_dimensions(js_file_path)
