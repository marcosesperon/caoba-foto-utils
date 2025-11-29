# CAOBA (v1.0.4)

CAOBA es una aplicación de escritorio sencilla y potente diseñada para ayudarte con dos tareas comunes en la gestión de imágenes: crear vídeos a partir de tus fotos y redimensionar imágenes en lote.

## ✨ Funcionalidades Principales

La aplicación se divide en dos módulos principales:

1.  **Creador de Slideshows (Vídeos)**
2.  **Redimensionador de Imágenes**

---

### 🎬 Creador de Slideshows

Esta herramienta te permite transformar una colección de imágenes en un vídeo dinámico con música de fondo.

#### Características:

-   **Selección de Imágenes**: Elige una carpeta que contenga todas las imágenes (en formato JPG) que deseas incluir en tu vídeo.
-   **Orden Personalizado**: Ordena las imágenes por **nombre de archivo** o por **fecha de captura** (leyendo los metadatos EXIF) para una secuencia cronológica perfecta.
-   **Vista Previa**: Visualiza el orden final de las imágenes antes de generar el vídeo para asegurarte de que todo está como deseas.
-   **Duración Ajustable**: Controla cuántos segundos se mostrará cada fotografía en el vídeo.
-   **Formatos de Vídeo**: Exporta tu vídeo en múltiples relaciones de aspecto para adaptarlo a cualquier plataforma:
    -   **Panorámicos**: 16:9 (TV, YouTube)
    -   **Verticales**: 9:16 (Stories, Reels), 4:5 (Feed de Instagram), 2:3 (Formato clásico)
    -   **Horizontales**: 5:4, 3:2 (Formatos de feed y fotografía)
-   **Transiciones Suaves**: Habilita una opción para añadir transiciones de fundido entre fotos, dando un acabado más profesional a tu vídeo.
-   **Marca de Agua (Branding)**: Añade tu propio logo (en formato PNG) a los vídeos. Controla la **posición** (esquinas o centro), el **tamaño** (como porcentaje del ancho del vídeo) y la **opacidad** para una integración perfecta.
-   **Banda Sonora Personalizable**:
    -   Añade una o más pistas de audio para crear la atmósfera perfecta.
    -   Activa un **fundido de salida** para que la música se desvanezca suavemente al final.
    -   Utiliza la **normalización de volumen** para que todas tus canciones suenen a un nivel consistente.
-   **Control de Progreso**: Sigue el proceso de generación del vídeo en tiempo real con una barra de progreso.

#### ¿Cómo se usa?

1.  **Origen**: Selecciona la carpeta con tus imágenes JPG.
2.  **Configuración**: Ajusta la duración por foto, el formato de salida y si quieres transiciones.
3.  **Branding y Audio**: Configura tu marca de agua y añade las canciones que desees.
4.  **Destino**: Elige dónde guardar el archivo de vídeo `.mp4` resultante.
5.  **Generar**: Haz clic en "GENERAR VIDEO" y espera a que el proceso finalice.

---

### 🖼️ Redimensionador de Imágenes

Una utilidad para cambiar el tamaño de muchas imágenes a la vez, de forma rápida y segura.

#### Características:

-   **Procesamiento por Lote**: Selecciona una carpeta y la aplicación redimensionará todas las imágenes JPG que encuentre dentro.
-   **Tamaño Máximo Inteligente**: Define una dimensión máxima (por ejemplo, 2000 píxeles). La aplicación redimensionará cada imagen para que su lado más largo no supere ese tamaño, manteniendo siempre la proporción original.
-   **Modos de Guardado**:
    -   **Crear Copias (Seguro)**: Guarda las imágenes redimensionadas como archivos nuevos (ej: `foto_resized.jpg`), dejando intactos los originales. **Este es el modo recomendado.**
    -   **Sobrescribir (Destructivo)**: Reemplaza los archivos originales con su versión redimensionada. **¡Usa esta opción con precaución, ya que los cambios son permanentes!**

#### ¿Cómo se usa?

1.  **Origen**: Selecciona la carpeta con las imágenes JPG que quieres modificar.
2.  **Tamaño**: Especifica el tamaño máximo en píxeles para el lado más largo de las imágenes.
3.  **Modo**: Elige si quieres crear copias nuevas o sobrescribir los archivos originales.
4.  **Redimensionar**: Haz clic en "REDIMENSIONAR" para iniciar el proceso.

---

## 🛠️ Tecnologías Utilizadas

-   **Interfaz**: HTML5
-   **Estilos**: TailwindCSS y daisyUI para un diseño moderno y responsivo.
-   **Lógica de Frontend**: JavaScript (ES6+)

*(Nota: La lógica de procesamiento de archivos y vídeo (backend) se infiere que es manejada por un entorno como Electron o Tauri, que permite a JavaScript interactuar con el sistema de archivos del usuario).*