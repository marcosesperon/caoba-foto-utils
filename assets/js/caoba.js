const CAOBA = {

    DOM: {

        navButtons: document.querySelectorAll('.nav-btn'),
        appSections: document.querySelectorAll('.app-section'),

        progressBar: {
            wrapper: document.getElementById('progress-bar-wrapper'),
            bar: document.getElementById('progress-bar'),
            text: document.getElementById('progress-bar-text')
        },

        status: {
            wrapper: document.getElementById('status-wrapper'),
            div: document.getElementById('status'),
            text: document.getElementById('status-text')
        }

    },

    FN: {
        setProgressBar: function( p_params ) {

            if( typeof p_params === 'undefined' ) p_params = {};
            if( typeof p_params.value === 'undefined' ) p_params.value = (-1);

            if( p_params.value < 0 ) {
                CAOBA.DOM.progressBar.wrapper.classList.add('hidden');
            } else {
                CAOBA.DOM.progressBar.bar.value = p_params.value;
                CAOBA.DOM.progressBar.text.innerText = p_params.value.toString() + '%';
                CAOBA.DOM.progressBar.wrapper.classList.remove('hidden');
            };

        },

        setStatus: function( p_params ) {

            if( typeof p_params === 'undefined' ) p_params = {};
            if( typeof p_params.class === 'undefined' ) p_params.class = '';
            if( typeof p_params.text === 'undefined' ) p_params.text = '';

            CAOBA.DOM.status.div.className = 'alert alert-soft';
            if( p_params.text === '' ) {
                CAOBA.DOM.status.wrapper.classList.add('hidden');
            } else {
                CAOBA.DOM.status.wrapper.classList.remove('hidden');
            };
            if( p_params.class !== '' ) CAOBA.DOM.status.div.classList.add( p_params.class );
            
            CAOBA.DOM.status.text.innerText = p_params.text;

        }

    },

    init: function() {

        CAOBA.DOM.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {

                // 1. Quitar clase active de todos los botones y estilos
                CAOBA.DOM.navButtons.forEach(b => {
                    b.checked = false;
                });

                // 2. Ocultar todas las secciones
                CAOBA.DOM.appSections.forEach(s => s.classList.add('hidden') );

                // 3. Activar botón actual
                btn.checked = true;
                
                // 4. Mostrar sección objetivo
                const targetId = 'section-' + btn.getAttribute('data-target');

                document.getElementById(targetId).classList.remove('hidden');
                document.getElementById(targetId + '-actions').classList.remove('hidden');
                
                CAOBA.FN.setProgressBar();
                CAOBA.FN.setStatus();

            });
        });

        window.api.onProgress((data) => {

            if (data.percent === undefined) data.percent = 0;

            // 1. Actualizamos la barra como siempre
            CAOBA.FN.setProgressBar({'value': data.percent, 'text': Math.round(data.percent).toString() + '%' });

            // 2. NUEVO: Actualizamos el texto de estado con el fichero
            // Usamos un icono de reloj de arena para indicar proceso
            CAOBA.FN.setStatus({'text': `⏳ Procesando imagen: ${data.file}`});

        });

        delete CAOBA.init;

    }

}; 

CAOBA.init();