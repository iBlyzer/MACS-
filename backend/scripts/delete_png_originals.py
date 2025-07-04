import os
import sys

def delete_png_files():
    """
    Deletes all PNG images in the ../uploads directory for which a .webp version exists.
    """
    try:
        script_dir = os.path.dirname(os.path.abspath(__file__))
        uploads_dir = os.path.join(script_dir, '..', 'uploads')

        if not os.path.isdir(uploads_dir):
            print(f"Error: El directorio de subida no se encuentra en '{uploads_dir}'")
            sys.exit(1)

        print(f"Buscando archivos .png para eliminar en: {uploads_dir}")

        files = os.listdir(uploads_dir)
        png_files = [f for f in files if f.lower().endswith('.png')]

        if not png_files:
            print("No se encontraron archivos .png para eliminar.")
            return

        print(f"Se encontraron {len(png_files)} archivos .png. Verificando y eliminando...")
        
        deleted_count = 0
        skipped_count = 0

        for filename in png_files:
            png_path = os.path.join(uploads_dir, filename)
            webp_filename = os.path.splitext(filename)[0] + '.webp'
            webp_path = os.path.join(uploads_dir, webp_filename)

            if os.path.exists(webp_path):
                try:
                    os.remove(png_path)
                    print(f"Eliminado: {filename}")
                    deleted_count += 1
                except Exception as e:
                    print(f"Error al eliminar {filename}: {e}")
            else:
                print(f"Omitido: No se encontró {webp_filename} para {filename}")
                skipped_count += 1

        print(f"\nEliminación completada. Se eliminaron {deleted_count} archivos. Se omitieron {skipped_count} archivos.")

    except Exception as e:
        print(f"Ha ocurrido un error inesperado: {e}")
        sys.exit(1)

if __name__ == '__main__':
    delete_png_files()
