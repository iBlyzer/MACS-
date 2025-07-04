import os
import sys
from PIL import Image

def convert_png_to_webp():
    """
    Converts all PNG images in the ../uploads directory to WebP format.
    """
    try:
        # The script is expected to be in the 'backend/scripts' directory.
        # The images are in 'backend/uploads'.
        script_dir = os.path.dirname(os.path.abspath(__file__))
        uploads_dir = os.path.join(script_dir, '..', 'uploads')

        if not os.path.isdir(uploads_dir):
            print(f"Error: El directorio de subida no se encuentra en '{uploads_dir}'")
            sys.exit(1)

        print(f"Buscando archivos .png en el directorio: {uploads_dir}")

        # List all files in the uploads directory
        files = os.listdir(uploads_dir)
        png_files = [f for f in files if f.lower().endswith('.png')]

        if not png_files:
            print("No se encontraron archivos .png para convertir.")
            return

        print(f"Se encontraron {len(png_files)} archivos .png. Empezando la conversión...")

        for filename in png_files:
            png_path = os.path.join(uploads_dir, filename)
            # Create new filename by replacing .png with .webp
            webp_filename = os.path.splitext(filename)[0] + '.webp'
            webp_path = os.path.join(uploads_dir, webp_filename)

            try:
                # Open the PNG image and save it as WebP
                with Image.open(png_path) as img:
                    img.save(webp_path, 'webp')
                print(f"Convertido: {filename} -> {webp_filename}")
            except Exception as e:
                print(f"Error al convertir {filename}: {e}")

        print("\nConversión completada.")

    except Exception as e:
        print(f"Ha ocurrido un error inesperado: {e}")
        sys.exit(1)

if __name__ == '__main__':
    try:
        from PIL import Image
    except ImportError:
        print("La librería 'Pillow' es necesaria. Por favor, instálala usando: pip install Pillow")
        sys.exit(1)
    
    convert_png_to_webp()
