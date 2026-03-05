import os
import sys

try:
    from google import genai
except ImportError:
    print("Error: No se encontró el módulo 'google-genai'. Por favor, instalalo con: pip install google-genai")
    sys.exit(1)

# El cliente asume que la variable de entorno GEMINI_API_KEY está configurada.
client = genai.Client()

def count_tokens_in_directory(directory):
    # Extensiones de archivos que queremos contar
    valid_extensions = {'.html', '.css', '.js', '.json'}
    
    total_project_tokens = 0
    
    print(f"{'Archivo':<30} | {'Tokens':<10}")
    print("-" * 45)
    
    files_to_check = []
    for filename in os.listdir(directory):
        filepath = os.path.join(directory, filename)
        if os.path.isfile(filepath):
            _, ext = os.path.splitext(filename)
            if ext.lower() in valid_extensions:
                files_to_check.append((filename, filepath))
                
    files_to_check.sort()
    
    for filename, filepath in files_to_check:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                contents = f.read()
                
            response = client.models.count_tokens(
                model="gemini-3-flash-preview", 
                contents=contents
            )
            
            # Extraer la propiedad total_tokens de la respuesta (usualmente un objeto CountTokensResponse)
            tokens = getattr(response, 'total_tokens', None)
            if tokens is None:
                if isinstance(response, int):
                    tokens = response
                elif getattr(response, 'usage_metadata', None):
                    tokens = response.usage_metadata.total_tokens
                elif isinstance(response, dict):
                    tokens = response.get('total_tokens', response)
                else:
                    tokens = str(response)

            try:
                tokens_int = int(tokens)
                total_project_tokens += tokens_int
            except (ValueError, TypeError):
                pass
                
            print(f"{filename:<30} | {tokens}")
        except Exception as e:
            print(f"{filename:<30} | Error: {e}")
                    
    print("-" * 45)
    print(f"{'Total de la carpeta':<30} | {total_project_tokens}")

if __name__ == "__main__":
    current_dir = os.path.dirname(os.path.abspath(__file__))
    count_tokens_in_directory(current_dir)
