const RESIZER = {

    DOM: {

        btnSourcePath: document.getElementById('resizer-btn-source-path'),
        inputSourcePath: document.getElementById('resizer-input-source-path'),
        infoSourcePath: document.getElementById('resizer-info-source-path'),

        inputMaxSize: document.getElementById('resizer-input-maxsize'),


        actionCancelWrapper: document.getElementById('resizer-action-cancel-wrapper'),
        btnActionCancel: document.getElementById('resizer-btn-action-cancel'),
        btnActionGenerate: document.getElementById('resizer-btn-action-generate')

    },

    FN: {

        setInfoSourcePath: function( p_params ) {

            if( typeof p_params === 'undefined' ) p_params = {};
            if( typeof p_params.class === 'undefined' ) p_params.class = '';
            if( typeof p_params.text === 'undefined' ) p_params.text = '';

            RESIZER.DOM.infoSourcePath.className = 'text-accent';
            if( p_params.text === '' ) {
                RESIZER.DOM.infoSourcePath.classList.add('hidden');
            } else {
                RESIZER.DOM.infoSourcePath.classList.remove('hidden');
            };
            if( p_params.class !== '' ) RESIZER.DOM.infoSourcePath.classList.add( p_params.class );

            RESIZER.DOM.infoSourcePath.innerText = p_params.text;

        },

    },

    init: function() {

        RESIZER.DOM.btnSourcePath.addEventListener('click', async () => {
            const path = await window.api.selectFolder();
            if (path) {
                RESIZER.DOM.inputSourcePath.value = path;
                
                const fileList = await window.api.scanAndSortFiles(path, 'name');
                let totalPhotos = fileList.length;
                if( typeof totalPhotos === 'undefined' ) totalPhotos = 0;

                RESIZER.FN.setInfoSourcePath({'text': `${totalPhotos} fotos válidas.`, 'class': `text-${totalPhotos > 0 ? 'success' : 'error'}`});

                RESIZER.DOM.btnActionGenerate.disabled = (totalPhotos === 0);
                
            };
        });

        RESIZER.DOM.btnActionCancel.addEventListener('click', async () => {
            
            RESIZER.DOM.btnActionCancel.disabled = true;
            RESIZER.DOM.btnActionCancel.innerHTML = 'Cancelando...';
            
            CAOBA.FN.setStatus({'text': 'Intentando detener el proceso...', 'class': 'alert-warning'});
            
            await window.api.cancelGeneration();

        });

        RESIZER.DOM.btnActionGenerate.addEventListener('click', async () => {
            
            const folderPath = RESIZER.DOM.inputSourcePath.value;
            const dimension = RESIZER.DOM.inputMaxSize.value;

            const saveMode = document.querySelector('input[name="resizer-input-mode"]:checked').value;

            if (!folderPath) {
                CAOBA.FN.setStatus({'text': 'Selecciona una carpeta primero.', 'class': 'alert-error'});
                return;
            };
            if (!dimension || dimension < 50) {
                CAOBA.FN.setStatus({'text': 'Indica un tamaño válido (mínimo 50px)', 'class': 'alert-error'});
                return;
            };

            RESIZER.DOM.btnActionGenerate.disabled = true;
            RESIZER.DOM.actionCancelWrapper.classList.remove('hidden');

            CAOBA.FN.setProgressBar();
            CAOBA.FN.setStatus({'text': `⏳ Iniciando...`});

            if (saveMode === 'overwrite') {
                CAOBA.FN.setStatus({'text': '⚠️ Procesando y SOBRESCRIBIENDO originales... No cierres la aplicación.', 'class': 'alert-warning'});
            } else {
                CAOBA.FN.setStatus({'text': 'Procesando y creando copias nuevas... Por favor espera.', 'class': 'alert-warning'});
            };

            try {
                // Llamada al nuevo API
                const result = await window.api.resizerGenerate(folderPath, dimension, saveMode);

                if (result.success) {
                    CAOBA.FN.setStatus({'text': `¡Proceso completado!\n${result.message}`, 'class': 'alert-success'});
                } else {
                    throw new Error(result.error);
                };
            } catch (err) {
                CAOBA.FN.setStatus({'text': `Error:\n${err.message}`, 'class': 'alert-error'});
                RESIZER.DOM.actionCancelWrapper.classList.add('hidden');
            } finally {
                RESIZER.DOM.btnActionGenerate.disabled = false;
                RESIZER.DOM.actionCancelWrapper.classList.add('hidden');
            };

        });

        delete RESIZER.init;

    }

};

RESIZER.init();