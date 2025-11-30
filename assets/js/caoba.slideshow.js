const SLIDESHOW = {

  VARS: {
    totalPhotos: 0,
    musicTracks: [],
    isGenerating: false,
    currentFolderPath: '',
    watermark: {
      path: null,
      position: 'bottom_right',
      size: 100, // en porcentaje
      opacity: 0.8 // en formato 0-1
    },
    audio: {
      fadeout: true,
      normalize: false
    }
  },

  DOM: {

    inputSourcePath: document.getElementById('slide-input-source-path'),
    btnSourcePath: document.getElementById('slide-btn-source-path'),
    infoSourcePath: document.getElementById('slide-info-source-path'),

    sortOptions: {
        wrapper: document.getElementById('slide-source-sort-options'),
        options: document.querySelectorAll('input[name="slide-source-sort-mode"]')
    },

    fileList: {
        wrapper: document.getElementById('slide-source-file-list-wrapper'),
        preview: document.getElementById('slide-source-file-list-preview')
    },

    inputDuration: document.getElementById('slide-input-duration'),
    inputTransition: document.getElementById('slide-input-transition'),
    selectVideoFormat: document.getElementById('slide-select-video-format'),

    inputWatermarkPath: document.getElementById('slide-input-watermark-path'),
    btnWatermarkPath: document.getElementById('slide-btn-watermark-path'),
    watermarkOptions: document.getElementById('slide-watermark-options'),
    watermark: {
        selectPosition: document.getElementById('slide-select-watermark-position'),
        rangeSize: document.getElementById('slide-range-watermark-size'),
        rangeOpacity: document.getElementById('slide-range-watermark-opacity'),
        valueSize: document.getElementById('slide-watermark-value-size'),
        valueOpacity: document.getElementById('slide-watermark-value-opacity')
    },

    musicList: {
        wrapper: document.getElementById('slide-music-list-wrapper'),
        button: document.getElementById('slide-music-list-btn')
    },
    audio: {
      fadeout: document.getElementById('slide-input-audio-fadeout'),
      fadeoutWrapper: document.getElementById('slide-audio-fadeout-wrapper'),
      normalize: document.getElementById('slide-input-audio-normalize'),
      normalizeWrapper: document.getElementById('slide-normalize-wrapper')
    },

    inputDestinationPath: document.getElementById('slide-input-destination-path'),
    btnDestinationPath: document.getElementById('slide-btn-destination-path'),

    actionCancelWrapper: document.getElementById('slide-action-cancel-wrapper'),
    btnActionCancel: document.getElementById('slide-btn-action-cancel'),
    btnActionGenerate: document.getElementById('slide-btn-action-generate')

  },

  FN: {

    setInfoSourcePath: function( p_params ) {

        if( typeof p_params === 'undefined' ) p_params = {};
        if( typeof p_params.class === 'undefined' ) p_params.class = '';
        if( typeof p_params.text === 'undefined' ) p_params.text = '';

        SLIDESHOW.DOM.infoSourcePath.className = 'text-accent';
        if( p_params.text === '' ) {
            SLIDESHOW.DOM.infoSourcePath.classList.add('hidden');
        } else {
            SLIDESHOW.DOM.infoSourcePath.classList.remove('hidden');
        };
        if( p_params.class !== '' ) SLIDESHOW.DOM.infoSourcePath.classList.add( p_params.class );

        SLIDESHOW.DOM.infoSourcePath.innerText = p_params.text;

    },

    renderFilePreview: function(filesList) {

        SLIDESHOW.DOM.fileList.preview.innerHTML = '';

        if (!filesList || filesList.length === 0) {
          SLIDESHOW.DOM.sortOptions.wrapper.classList.add('hidden');
          SLIDESHOW.DOM.fileList.wrapper.classList.add('hidden');
          return;
        };

        SLIDESHOW.DOM.sortOptions.wrapper.classList.remove('hidden');

        // Usamos un DocumentFragment para mejorar el rendimiento al insertar muchos elementos
        const fragment = document.createDocumentFragment();

        filesList.forEach((fileName, index) => {
            const row = document.createElement('div');
            // Estilo de fila alterno para facilitar la lectura
            row.style.padding = '3px 5px';
            if (index % 2 === 0) row.style.backgroundColor = '#fff';
            
            // Formato: "1. nombre_archivo.jpg"
            // Usamos padStart para alinear los números (001, 002...) si hay muchas fotos
            const indexStr = (index + 1).toString().padStart(filesList.length.toString().length, '0');
            
            row.innerText = `${indexStr}. ${fileName}`;
            fragment.appendChild(row);
        });

        SLIDESHOW.DOM.fileList.preview.appendChild(fragment);
        SLIDESHOW.DOM.fileList.wrapper.classList.remove('hidden');
        SLIDESHOW.DOM.fileList.preview.scrollTop = 0;

    },

    addMusicRow: function(filePath, isFirst = false) {

        const rowId = Date.now();
        const row = document.createElement('div');
        row.className = 'music-row';
        row.id = `music-row-${rowId}`;

        let optionsHTML = `
        <div class="radio-group text-xs">
        <div class="flex">
            <label class="radio-option">
                <input type="radio" class="radio" name="start-mode-${rowId}" value="auto" checked onchange="SLIDESHOW.FN.toggleStartMode(${rowId}, false)">
                <span>Justo después de la anterior (con disolvencia)</span>
            </label>
            </div>
            <div class="flex items-center justify-between">
            <label class="radio-option">
                <input type="radio" class="radio" name="start-mode-${rowId}" value="manual" onchange="SLIDESHOW.FN.toggleStartMode(${rowId}, true)">
                <span>A partir de una foto específica</span>
            </label>
            <div class="photo-select-container ml-2" id="photo-input-container-${rowId}" style="display:none;">
                <input type="number" class="input photo-select start-photo-input" min="2" max="${SLIDESHOW.VARS.totalPhotos}" value="${Math.min(2, SLIDESHOW.VARS.totalPhotos)}" placeholder="Foto #">
            </div>
            </div>
        </div>`;

        row.innerHTML = `
        <div class="card bg-base-100 w-100 shadow-sm mb-2"><div class="card-body">
            <div class="flex music-info">
                <input type="text" class="input grow music-path" value="${filePath}" readonly title="${filePath}">
                <button class="btn btn-square btn-sm ml-2 mt-1" onclick="SLIDESHOW.FN.removeMusicTrack(${rowId})"><svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor">
                <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M6 18L18 6M6 6l12 12" />
            </svg></button>
            </div>
            <div class="music-options">
                ${optionsHTML}
            </div>
        </div></div>`;

        SLIDESHOW.DOM.musicList.wrapper.appendChild(row);
        SLIDESHOW.VARS.musicTracks.push({ id: rowId, path: filePath });

        SLIDESHOW.FN.updateUIState();

    },

    updateUIState: function() {

        const hasDest = SLIDESHOW.DOM.inputDestinationPath.value.trim() !== '';

        SLIDESHOW.DOM.musicList.button.disabled = SLIDESHOW.VARS.totalPhotos === 0 || SLIDESHOW.VARS.isGenerating;

        // Ocultar/mostrar la opción de normalizar según el número de pistas
        if (SLIDESHOW.VARS.musicTracks.length > 0) {
            SLIDESHOW.DOM.audio.fadeoutWrapper.classList.remove('hidden');
            /*if (SLIDESHOW.VARS.musicTracks.length > 1) {
                SLIDESHOW.DOM.audio.normalizeWrapper.classList.remove('hidden');
            } else {
                SLIDESHOW.DOM.audio.normalizeWrapper.classList.add('hidden');
            }*/
        } else {
            SLIDESHOW.DOM.audio.fadeoutWrapper.classList.add('hidden');
        }

        SLIDESHOW.DOM.btnActionGenerate.disabled = SLIDESHOW.VARS.totalPhotos === 0 || !hasDest || SLIDESHOW.VARS.isGenerating;
        document.querySelectorAll('.btn-delete').forEach(btn => btn.disabled = SLIDESHOW.VARS.isGenerating);

        SLIDESHOW.DOM.btnDestinationPath.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.btnSourcePath.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.btnWatermarkPath.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.watermark.selectPosition.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.watermark.rangeSize.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.watermark.rangeOpacity.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.audio.fadeout.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.audio.normalize.disabled = SLIDESHOW.VARS.isGenerating;

        SLIDESHOW.DOM.sortOptions.options.forEach(radio => radio.disabled = SLIDESHOW.VARS.isGenerating);

    },

    scanPhotosInFolder: async function(folderPath) {

        if (!folderPath) return;
        SLIDESHOW.VARS.currentFolderPath = folderPath;

        SLIDESHOW.DOM.inputSourcePath.value = folderPath;
        
        //CAOBA.FN.setStatus({'text': 'Analizando y ordenando fotos...'});

        SLIDESHOW.FN.setInfoSourcePath({'text': '⏳ Escaneando...'});
        
        // Deshabilitamos opciones mientras escanea
        SLIDESHOW.DOM.sortOptions.options.forEach(radio => radio.disabled = true);

        SLIDESHOW.FN.renderFilePreview([]);

        try {
            // Obtenemos el modo de ordenación actual
            // (Si es la primera vez, cogerá el que esté 'checked' por defecto en el HTML)
            const sortModeElement = document.querySelector('input[name="slide-source-sort-mode"]:checked');
            const sortMode = sortModeElement ? sortModeElement.value : 'name';

            const sortedFilesList = await window.api.scanAndSortFiles(SLIDESHOW.VARS.currentFolderPath, sortMode);
            SLIDESHOW.VARS.totalPhotos = sortedFilesList.length;
            if( typeof SLIDESHOW.VARS.totalPhotos === 'undefined' ) SLIDESHOW.VARS.totalPhotos = 0;

            // Si llegamos aquí, todo ha ido bien
            if (SLIDESHOW.VARS.totalPhotos < 2) {

                SLIDESHOW.FN.setInfoSourcePath({'text': `Se encontraron ${SLIDESHOW.VARS.totalPhotos} fotos válidas. Se necesitan al menos 2.`, 'class': 'text-error'});
                SLIDESHOW.VARS.totalPhotos = 0;
                SLIDESHOW.FN.renderFilePreview([]);

            } else {
                
                SLIDESHOW.FN.setInfoSourcePath({'text': `${SLIDESHOW.VARS.totalPhotos} fotos válidas (Ordenado por: ${sortMode === 'name' ? 'Nombre' : 'Fecha'}).`, 'class': 'text-success'});

                SLIDESHOW.FN.renderFilePreview(sortedFilesList);

            };
            
            CAOBA.FN.setStatus();

        } catch (error) {

            // --- CAPTURA DEL ERROR ---
            console.error("Error durante el escaneo:", error);
            SLIDESHOW.FN.setInfoSourcePath({'text': `Error técnico:\n${error.message}`, 'class': 'text-error'}); 
            //CAOBA.FN.setStatus({'text': `Error técnico:\n${error.message}`, 'class': 'alert-error'});

            SLIDESHOW.VARS.totalPhotos = 0;
            
            SLIDESHOW.FN.renderFilePreview([]);

        } finally {

            // Pase lo que pase, reactivamos los controles de UI
            SLIDESHOW.DOM.sortOptions.options.forEach(radio => radio.disabled = false);
            SLIDESHOW.FN.updateUIState();

        };

    },

    toggleStartMode: function (rowId, show) {
        const container = document.getElementById(`photo-input-container-${rowId}`);
        if (container) container.style.display = show ? 'block' : 'none';
    },

    removeMusicTrack: function (idToRemove) {

        if (SLIDESHOW.VARS.isGenerating) return; 

        SLIDESHOW.VARS.musicTracks = SLIDESHOW.VARS.musicTracks.filter(track => track.id !== idToRemove);
        document.getElementById(`music-row-${idToRemove}`).remove();
        
        SLIDESHOW.FN.updateUIState();
    }

  },

  init: function() {

    SLIDESHOW.DOM.btnSourcePath.addEventListener('click', async () => {

        if (SLIDESHOW.VARS.isGenerating) return;

        const path = await window.api.selectFolder();

        if (path) {
        SLIDESHOW.DOM.musicList.wrapper.innerHTML = '';
        SLIDESHOW.VARS.musicTracks = [];
        if (!SLIDESHOW.DOM.inputDestinationPath.value) {
            const isWin = navigator.userAgent.includes('Windows'); const sep = isWin ? '\\' : '/';
            SLIDESHOW.DOM.inputDestinationPath.value = path + sep + "caoba_slideshow.mp4";
        };
        SLIDESHOW.FN.scanPhotosInFolder(path);
        };

    });

    SLIDESHOW.DOM.sortOptions.options.forEach(radio => {

    radio.addEventListener('change', () => {
        if (SLIDESHOW.VARS.currentFolderPath && !SLIDESHOW.VARS.isGenerating) SLIDESHOW.FN.scanPhotosInFolder(SLIDESHOW.VARS.currentFolderPath);
    });

    });

    SLIDESHOW.DOM.btnWatermarkPath.addEventListener('click', async () => {
      if (SLIDESHOW.VARS.isGenerating) return;

      const path = await window.api.slideshowSelectWatermark();
      if (path) {
        SLIDESHOW.VARS.watermark.path = path;
        SLIDESHOW.DOM.inputWatermarkPath.value = path;
        SLIDESHOW.DOM.watermarkOptions.classList.remove('hidden');
        SLIDESHOW.FN.updateUIState();
      }
    });

    SLIDESHOW.DOM.watermark.selectPosition.addEventListener('change', () => {
      if (SLIDESHOW.VARS.isGenerating) return;

      SLIDESHOW.VARS.watermark.position = SLIDESHOW.DOM.watermark.selectPosition.value;
    });

    SLIDESHOW.DOM.watermark.rangeSize.addEventListener('input', () => {
        if (SLIDESHOW.VARS.isGenerating) return;
        const size = SLIDESHOW.DOM.watermark.rangeSize.value;
        SLIDESHOW.VARS.watermark.size = parseInt(size);
        SLIDESHOW.DOM.watermark.valueSize.textContent = `${size}%`;
    });

    SLIDESHOW.DOM.watermark.rangeOpacity.addEventListener('input', () => {
        if (SLIDESHOW.VARS.isGenerating) return;
        const opacityValue = SLIDESHOW.DOM.watermark.rangeOpacity.value;
        // Guardamos como 0-1 para FFmpeg, pero mostramos 0-100%
        SLIDESHOW.VARS.watermark.opacity = parseFloat(opacityValue / 100);
        SLIDESHOW.DOM.watermark.valueOpacity.textContent = `${opacityValue}%`;
    });

    SLIDESHOW.DOM.audio.fadeout.addEventListener('change', () => {
      if (SLIDESHOW.VARS.isGenerating) return;

      SLIDESHOW.VARS.audio.fadeout = SLIDESHOW.DOM.audio.fadeout.checked;
    });

    SLIDESHOW.DOM.audio.normalize.addEventListener('change', () => {
      if (SLIDESHOW.VARS.isGenerating) return;

      SLIDESHOW.VARS.audio.normalize = SLIDESHOW.DOM.audio.normalize.checked;
    });


    SLIDESHOW.DOM.btnDestinationPath.addEventListener('click', async () => {

        if (SLIDESHOW.VARS.isGenerating) return;

        // Invocamos la nueva función del API
        const path = await window.api.saveFile();
        if (path) {
        SLIDESHOW.DOM.inputDestinationPath.value = path;
        SLIDESHOW.FN.updateUIState();
        };

    });

    SLIDESHOW.DOM.musicList.button.addEventListener('click', async () => {

        if (SLIDESHOW.VARS.isGenerating) return;
        const path = await window.api.selectFile();

        if (path) SLIDESHOW.FN.addMusicRow(path, SLIDESHOW.VARS.musicTracks.length === 0);

    });

    SLIDESHOW.DOM.btnActionCancel.addEventListener('click', async () => {

        if (!SLIDESHOW.VARS.isGenerating) return;
        
        SLIDESHOW.DOM.btnActionCancel.disabled = true;
        SLIDESHOW.DOM.btnActionCancel.innerHTML = 'Cancelando...';
        
        CAOBA.FN.setStatus({'text': 'Intentando detener el proceso...', 'class': 'alert-warning'});
        
        await window.api.cancelGeneration();

    });

    SLIDESHOW.DOM.btnActionGenerate.addEventListener('click', async () => {

        const durationPerPhoto = SLIDESHOW.DOM.inputDuration.value;

        const useVisualTransition = SLIDESHOW.DOM.inputTransition.checked;
        const videoFormat = SLIDESHOW.DOM.selectVideoFormat.value;

        const destinationPath = SLIDESHOW.DOM.inputDestinationPath.value;

        if (!destinationPath) { CAOBA.FN.setStatus({'text': 'Selecciona un destino.'}); return; };

        let finalMusicData = [];
        for (let i = 0; i < SLIDESHOW.VARS.musicTracks.length; i++) {
            const track = SLIDESHOW.VARS.musicTracks[i];
            const row = document.getElementById(`music-row-${track.id}`);
            let trackData = { path: track.path };
            if (i === 0) {
                trackData.mode = 'manual';
                trackData.startPhotoIndex = 0;
            } else {
                const mode = row.querySelector(`input[name="start-mode-${track.id}"]:checked`).value;
                trackData.mode = mode;
                if (mode === 'manual') {
                    const val = parseInt(row.querySelector('.start-photo-input').value);
                    if (isNaN(val) || val < 1 || val > SLIDESHOW.VARS.totalPhotos) {
                        CAOBA.FN.setStatus({'text': `Error pista ${i+1}: Foto inválida.`});
                        return;
                    };
                    trackData.startPhotoIndex = val - 1; 
                };
            };
            finalMusicData.push(trackData);
        };

        SLIDESHOW.VARS.isGenerating = true;
        SLIDESHOW.FN.updateUIState(); 

        CAOBA.FN.setStatus({'text': ((SLIDESHOW.VARS.musicTracks.length > 0) ? "⏳ Analizando audio y preparando mezcla..." : "⏳ Preparando video (sin audio)...") });

        CAOBA.FN.setProgressBar({'value': 0});
        
        SLIDESHOW.DOM.actionCancelWrapper.classList.remove('hidden');
        SLIDESHOW.DOM.btnActionCancel.disabled = false;
        SLIDESHOW.DOM.btnActionCancel.innerHTML = 'CANCELAR';

        // Enviamos la nueva propiedad 'destinationPath'
        const result = await window.api.slideshowGenerate({
            musicData: finalMusicData, 
            durationPerPhoto,
            useVisualTransition,
            videoFormat,
            destinationPath,
            watermarkData: SLIDESHOW.VARS.watermark,
            audioData: SLIDESHOW.VARS.audio
        });

        SLIDESHOW.VARS.isGenerating = false;
        SLIDESHOW.FN.updateUIState(); 

        SLIDESHOW.DOM.actionCancelWrapper.classList.add('hidden');
        CAOBA.FN.setStatus();

        if (result.success) {

            // Creamos un enlace '<a>' para que la ruta sea clickeable
            const successMessage = `🎉 ¡Video completado!<br><a href="#" onclick="window.api.shellOpenPath('${result.path.replace(/\\/g, '\\\\')}')" class="link link-accent">${result.path}</a>`;
            
            // Usamos 'html' en lugar de 'text' para que se renderice el enlace
            CAOBA.FN.setStatus({'html': successMessage, 'class': 'alert-success'});
            CAOBA.FN.setProgressBar({'value': 100});

        } else {

            if( result.cancelado ) {
                CAOBA.FN.setProgressBar();
                CAOBA.FN.setStatus();
            } else {
                CAOBA.FN.setStatus({'text': `${result.error}`, 'class': (result.cancelado ? "alert-warning" : "alert-error")});
            };

        };
        
    });


    SLIDESHOW.FN.updateUIState();

    delete SLIDESHOW.init;

  }

};

SLIDESHOW.init();