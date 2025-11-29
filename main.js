const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn, execFile, exec } = require('child_process');
const sharp = require('sharp');
const fs = require('fs');
const fsPromises = require('fs').promises;
const exifParser = require('exif-parser');
const ffmpegPath = require('ffmpeg-static').replace('app.asar', 'app.asar.unpacked'); 
const ffprobePath = require('ffprobe-static').path.replace('app.asar', 'app.asar.unpacked');;

const CAOBA = {

    mainWindow: null,
    isCancelled: false,
    currentFolderRoot: '',
    currentSortedFiles: [],

    FN: {

        createWindow() {

            CAOBA.mainWindow = new BrowserWindow({
                width: 520, height: 800,
                resizable: false,
                autoHideMenuBar: true,
                icon: path.join(__dirname, 'build', 'icon.png'),
                webPreferences: {
                    preload: path.join(__dirname, 'preload.js'),
                    contextIsolation: true,
                    nodeIntegration: false
                }
            });

            CAOBA.mainWindow.loadFile('index.html');

        },

        timeToSeconds: function(timeString) {
            const parts = timeString.split(':');
            return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
        },

        getFileCreationDate: function(filePath) {

            try {
                // 1. Intentamos leer EXIF (es síncrono, rápido para archivos locales)
                const buffer = fs.readFileSync(filePath);
                const parser = exifParser.create(buffer);
                const result = parser.parse();
                
                // DateTimeOriginal es la fecha de captura real. CreateDate es secundaria.
                // exif-parser devuelve timestamps en segundos, multiplicamos por 1000 para JS.
                const exifTimestamp = result.tags.DateTimeOriginal || result.tags.CreateDate;
                
                if (exifTimestamp) return new Date(exifTimestamp * 1000);
                
            } catch (e) {
                // Si falla EXIF (no tiene metadatos o no es un JPG estándar), ignoramos y seguimos.
            };

            // 2. Fallback: Usar fechas del sistema de archivos
            const stats = fs.statSync(filePath);
            // 'birthtime' es fecha de creación (mejor), 'mtime' es modificación (peor caso)
            return stats.birthtime || stats.mtime;

        },

        getRawJpgFilenames: function(folder) {
            try {
                const allFiles = fs.readdirSync(folder);
                return allFiles.filter(file => {
                    const isJpgExtension = file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.jpeg');
                    const isHiddenOrMetadata = file.startsWith('.');
                    return isJpgExtension && !isHiddenOrMetadata;
                });
            } catch (e) {
                console.error("Error leyendo directorio:", e);
                return []; 
            };
        }

    }

};

const SLIDESHOW = {

    currentFFmpegProcess: null,

    FN: {

        getAudioDuration: function(filePath) {
            return new Promise((resolve, reject) => {
                execFile(ffprobePath, [
                    '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', filePath
                ], (error, stdout, stderr) => {
                    if (error) reject(error);
                    else {
                        const duration = parseFloat(stdout);
                        if (isNaN(duration)) reject(new Error("No se pudo leer duración"));
                        else resolve(duration);
                    };
                });
            });
        }

    }
};

app.whenReady().then( CAOBA.FN.createWindow );


// ==================================================================
//  CAOBA
// ==================================================================
ipcMain.handle('dialog:select-folder', async () => {
    const result = await dialog.showOpenDialog(CAOBA.mainWindow, { properties: ['openDirectory'] });
    return result.filePaths[0];
});

ipcMain.handle('dialog:select-file', async () => {
    const result = await dialog.showOpenDialog(CAOBA.mainWindow, {
        filters: [{ name: 'Audio MP3', extensions: ['mp3'] }],
        properties: ['openFile']
    });
    return result.filePaths[0];
});

ipcMain.handle('slideshow:select-watermark', async () => {
    const result = await dialog.showOpenDialog(CAOBA.mainWindow, {
        title: 'Selecciona tu logo',
        filters: [{ name: 'Imágenes', extensions: ['png'] }],
        properties: ['openFile']
    });
    return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('dialog:save-file', async () => {
    const result = await dialog.showSaveDialog(CAOBA.mainWindow, {
        title: 'Guardar Video Final',
        defaultPath: 'caoba_slideshow.mp4',
        filters: [{ name: 'Video MP4', extensions: ['mp4'] }]
    });
    return result.canceled ? null : result.filePath;
});

ipcMain.handle('util:scan-and-sort', async (event, folder, sortMode) => {
    
    CAOBA.currentFolderRoot = folder; // Guardamos la raíz para luego
    const rawFilenames = CAOBA.FN.getRawJpgFilenames(folder);
    
    if (rawFilenames.length < 2) {
        CAOBA.currentSortedFiles = [];
        return 0;
    };

    console.log(`Escaneando ${rawFilenames.length} fotos. Modo: ${sortMode}`);

    if (sortMode === 'name') {

        // Ordenación alfabética simple (insensible a mayúsculas)
        CAOBA.currentSortedFiles = rawFilenames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    } else if (sortMode === 'date') {
    
        // Ordenación por fecha (EXIF preferente)
        // Creamos un array temporal de objetos { nombre, fecha } para ordenar eficientemente
        const filesWithDate = rawFilenames.map(filename => ({
            name: filename,
            date: CAOBA.FN.getFileCreationDate(path.join(folder, filename))
        }));

        // Ordenamos basándonos en el objeto Date (de más antiguo a más nuevo)
        filesWithDate.sort((a, b) => a.date - b.date);

        // Extraemos solo los nombres ya ordenados
        CAOBA.currentSortedFiles = filesWithDate.map(f => f.name);
    
    };
    
    // Devolvemos los ficheros para que el frontend lo sepa
    return CAOBA.currentSortedFiles;

});

ipcMain.handle('action:cancel', async () => {

    CAOBA.isCancelled = true;

    if (SLIDESHOW.currentFFmpegProcess && SLIDESHOW.currentFFmpegProcess.pid) {
        console.log(`Solicitada cancelación forzada del PID: ${SLIDESHOW.currentFFmpegProcess.pid}`);    
        if (process.platform === 'win32') {
            try { spawn('taskkill', ['/pid', SLIDESHOW.currentFFmpegProcess.pid, '/f', '/t']); } catch (e) { SLIDESHOW.currentFFmpegProcess.kill(); }
        } else {
            SLIDESHOW.currentFFmpegProcess.kill('SIGKILL');
        };
    };

    return true;

});


// ==================================================================
//  SLIDESHOW
// ==================================================================
ipcMain.handle('action:slide-generate', async (event, { musicData, durationPerPhoto, useVisualTransition, videoFormat, destinationPath, watermarkData, audioData }) => {
    return new Promise(async (resolve) => { 
        
        SLIDESHOW.currentFFmpegProcess = null;
        CAOBA.isCancelled = false;
        
        const folder = CAOBA.currentFolderRoot;
        const files = CAOBA.currentSortedFiles; 

        const outputFile = destinationPath;
        const filterScriptFile = path.join(folder, 'temp_filter_script.txt');

        if (fs.existsSync(outputFile)) try { fs.unlinkSync(outputFile); } catch(e){}
        if (fs.existsSync(filterScriptFile)) try { fs.unlinkSync(filterScriptFile); } catch(e){}

        try {
            // Validación de seguridad por si acaso
            if (!folder || files.length < 2) throw new Error("Error de estado: No hay archivos seleccionados u ordenados.");

            let targetW, targetH;
            switch (videoFormat) {
                case '916_v': targetW = 1080; targetH = 1920; break;
                case '45_v':  targetW = 1080; targetH = 1350; break;
                case '23_v':  targetW = 1280; targetH = 1920; break;
                case '45_h':  targetW = 1350; targetH = 1080; break;
                case '23_h':  targetW = 1920; targetH = 1280; break;
                case '169_h': default: targetW = 1920; targetH = 1080; break;
            };
            
            const hasAudio = musicData && musicData.length > 0;
            const secPerPhoto = parseFloat(durationPerPhoto);
            const videoTransDuration = useVisualTransition ? 1.0 : 0; 
            const totalVideoDuration = useVisualTransition 
                ? (files.length * secPerPhoto) + videoTransDuration 
                : files.length * secPerPhoto;
            
            const audioCrossfadeDuration = 3; 
            let calculatedMusicData = [];
            
            // FASE 0: PRE-CÁLCULO AUDIO
            if (hasAudio) {
                console.log("--- Iniciando pre-cálculo de audio ---");
                let currentAudioTailTime = 0; 
                for (let i = 0; i < musicData.length; i++) {
                    if (CAOBA.isCancelled) throw new Error("Cancelado por el usuario.");
                    const track = musicData[i];
                    let duration = 0;
                    try { duration = await SLIDESHOW.FN.getAudioDuration(track.path); } catch (e) { throw new Error(`Error leyendo pista ${i+1}.`); }
                    let startTimeSec = (track.mode === 'manual') ? track.startPhotoIndex * secPerPhoto : Math.max(0, currentAudioTailTime - audioCrossfadeDuration);
                    currentAudioTailTime = startTimeSec + duration;
                    calculatedMusicData.push({ path: track.path, startTimeSec: startTimeSec });
                };
            };

            if (CAOBA.isCancelled) throw new Error("Cancelado por el usuario.");

            console.log(`>>> GENERANDO COMANDO CON ${files.length} FOTOS ORDENADAS <<<`);
            
            let inputStr = ""; 
            let filterComplex = "";
            const videoInputCount = files.length;
            const d_show = secPerPhoto + videoTransDuration; 
            
            const normalizeForCmd = (p) => p.split(path.sep).join('/');

            // 1. INPUTS DE VIDEO (Usando la lista 'files' que ya está ordenada)
            files.forEach(file => { 
                inputStr += ` -loop 1 -t ${d_show} -i "${file}"`; 
            });

            // 2. INPUTS DE AUDIO
            if (hasAudio) { 
                calculatedMusicData.forEach((track) => { 
                    inputStr += ` -stream_loop -1 -i "${normalizeForCmd(track.path)}"`; 
                }); 
            };

            // 3. CONSTRUIR EL GRAFO DE FILTROS (Igual que antes)
            for (let i = 0; i < videoInputCount; i++) { 
                filterComplex += `[${i}]scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease,pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=25,format=yuv420p[vPre${i}];`; 
            };

            if (useVisualTransition) {
                let offset = secPerPhoto;
                for (let i = 0; i < videoInputCount - 1; i++) {
                    const input1 = (i === 0) ? `[vPre0]` : `[vMix${i}]`; const input2 = `[vPre${i+1}]`; const output = (i === files.length - 2) ? `[vFinalVideo]` : `[vMix${i+1}]`;
                    filterComplex += `${input1}${input2}xfade=transition=fade:duration=${videoTransDuration}:offset=${offset}${output};`;
                    offset += secPerPhoto;
                };
            } else {
                for (let i = 0; i < videoInputCount; i++) { filterComplex += `[vPre${i}]`; }
                filterComplex += `concat=n=${videoInputCount}:v=1:a=0[vFinalVideo];`;
            };

            // 4. AÑADIR MARCA DE AGUA (si existe)
            let watermarkFilter = '';
            if (watermarkData && watermarkData.path) {
                inputStr += ` -i "${normalizeForCmd(watermarkData.path)}"`;
                const watermarkInputLabel = `[${videoInputCount + (hasAudio ? calculatedMusicData.length : 0)}:v]`;

                // --- NUEVA LÓGICA DE ESCALADO (PRE-CÁLCULO) ---
                // 1. Obtenemos las dimensiones originales del logo con Sharp.
                const imageMetadata = await sharp(watermarkData.path).metadata();
                const originalWidth = imageMetadata.width;
                const originalHeight = imageMetadata.height;

                // 2. Calculamos el ancho final del logo basado en el porcentaje del ancho del vídeo.
                const logoFinalWidth = Math.round(targetW * (watermarkData.size / 100));
                
                // 3. Calculamos el alto proporcional y lo redondeamos al número par más cercano para compatibilidad con el códec.
                const logoFinalHeight = Math.round((logoFinalWidth / originalWidth) * originalHeight / 2) * 2;

                // 4. Construimos un filtro 'scale' simple con valores fijos.
                const scaleFilter = `${watermarkInputLabel}scale=${logoFinalWidth}:${logoFinalHeight}[logo_scaled]`;
                // --- FIN NUEVA LÓGICA ---

                let overlayPosition = '';
                switch (watermarkData.position) {
                    case 'top_left':     overlayPosition = 'x=10:y=10'; break;
                    case 'top_right':    overlayPosition = 'x=W-w-10:y=10'; break;
                    case 'center':       overlayPosition = 'x=(W-w)/2:y=(H-h)/2'; break;
                    case 'bottom_left':  overlayPosition = 'x=10:y=H-h-10'; break;
                    case 'bottom_right':
                    default:             overlayPosition = 'x=W-w-10:y=H-h-10'; break;
                }

                // Encadenamos los filtros: escalar, aplicar opacidad y superponer.
                // Usamos una etiqueta intermedia [vWithOverlay] para evitar reutilizar [vFinalVideo] como entrada y salida en el mismo filtro.
                watermarkFilter = `;${scaleFilter};[vFinalVideo][logo_scaled]overlay=${overlayPosition}[vWithOverlay];[vWithOverlay]colorchannelmixer=aa=${watermarkData.opacity}[vFinalVideo]`;
            }

            // Añadimos el filtro de la marca de agua (si se generó) al final de la cadena de filtros de vídeo.
            if (filterComplex.endsWith(';')) filterComplex = filterComplex.slice(0, -1);
            filterComplex += watermarkFilter;

            // 5. CONSTRUIR CADENA DE AUDIO
            let audioChainLabel = ''; // Declarar la variable fuera del bloque
            if (hasAudio) {
                // --- PASO 5.1: Mezcla de pistas (si hay más de una) ---
                let audioFilterComplex = ""; // Cadena de filtros solo para el audio
                audioChainLabel = `[${videoInputCount}:a]`; // Asignar el valor inicial
                if (calculatedMusicData.length > 1) { // Si hay más de una pista, se mezclan
                    let previousAudioLabel = `[${videoInputCount}:a]`;
                    for (let i = 1; i < calculatedMusicData.length; i++) {
                        const currentTrackMeta = calculatedMusicData[i];
                        const nextLabel = (i === calculatedMusicData.length - 1) ? `[audio_mixed]` : `[aMix${i}]`;
                        const trimDuration = currentTrackMeta.startTimeSec + audioCrossfadeDuration; // Duración hasta el punto de crossfade
                        audioFilterComplex += `${previousAudioLabel}atrim=duration=${trimDuration},asetpts=PTS-STARTPTS[aTrimmed${i}];`;
                        audioFilterComplex += `[aTrimmed${i}][${videoInputCount + i}:a]acrossfade=d=${audioCrossfadeDuration}${nextLabel};`;
                        previousAudioLabel = nextLabel;
                    }
                    audioChainLabel = `[audio_mixed]`;
                }

                // --- PASO 5.2: Normalización de volumen (si está activada) ---
                if (audioData.normalize && calculatedMusicData.length > 1) {
                    // Construimos el filtro de análisis de loudnorm
                    const loudnormAnalysisFilter = `${audioChainLabel}loudnorm=I=-16:LRA=11:print_format=json[aLoudnormOut]`;
                    // El comando de análisis solo debe contener los filtros de audio
                    const analysisFilterComplex = audioFilterComplex + loudnormAnalysisFilter;

                    // loudnorm es un proceso de 2 pasadas.
                    // 1ª pasada: Analizar el audio y no generar salida.
                    const analysisCmd = `"${ffmpegPath}" -y ${inputStr} -filter_complex "${analysisFilterComplex}" -map "[aLoudnormOut]" -vn -sn -f null -`;
                    console.log("--- Iniciando 1ª pasada de normalización de audio ---");

                    // Ejecutamos la primera pasada de forma síncrona para capturar su log
                    const analysisResult = await new Promise((resolveExec) => {
                        exec(analysisCmd, { cwd: folder }, (error, stdout, stderr) => {
                            resolveExec(stderr);
                        });
                    });

                    // Extraemos los valores medidos del log de FFmpeg
                    const measured = analysisResult.split('Parsed_loudnorm_')[1];
                    if (measured) {
                        const loudnormParams = JSON.parse(measured);
                        // Añadimos la 2ª pasada al filtro complejo con los valores medidos
                        audioFilterComplex += `${audioChainLabel}loudnorm=I=-16:LRA=11:measured_I=${loudnormParams.input_i}:measured_LRA=${loudnormParams.input_lra}:measured_tp=${loudnormParams.input_tp}:measured_thresh=${loudnormParams.input_thresh}:offset=${loudnormParams.target_offset}[audio_normalized];`;
                        audioChainLabel = `[audio_normalized]`;
                        console.log("--- 2ª pasada de normalización configurada ---");
                    }
                }

                // --- PASO 5.3: Fundido de salida (si está activado) ---
                if (audioData.fadeout) {
                    const fadeoutStart = totalVideoDuration - 3; // Fade-out en los últimos 3 segundos
                    if (fadeoutStart > 0) {
                        audioFilterComplex += `${audioChainLabel}afade=t=out:st=${fadeoutStart}:d=3[aFinalAudio];`;
                        audioChainLabel = `[aFinalAudio]`;
                    };
                }

                // Añadimos todos los filtros de audio a la cadena principal, asegurando la separación con punto y coma
                if (audioFilterComplex) {
                    filterComplex += (filterComplex ? ';' : '') + audioFilterComplex;
                }

                // --- PASO 5.4: Etiqueta de salida final ---
                // Nos aseguramos de que la salida final de la cadena de audio siempre tenga la misma etiqueta.
                // Usamos anull que simplemente pasa el audio sin modificarlo.
                filterComplex += `${audioChainLabel}anull[aFinal];`;
            }

            if (filterComplex.endsWith(';')) filterComplex = filterComplex.slice(0, -1);

            // GUARDAR SCRIPT
            fs.writeFileSync(filterScriptFile, filterComplex, { encoding: 'utf8' });

            const audioMapCmd = hasAudio ? `-map "[aFinal]"` : '';
            
            let metadataCmd = ` -metadata author="CAOBA"`;
            
            // COMANDO FINAL
            const cmdString = `"${ffmpegPath}" -y ${inputStr} -filter_complex_script "${normalizeForCmd(filterScriptFile)}" -map "[vFinalVideo]" ${audioMapCmd} ${metadataCmd} -c:v libx264 -pix_fmt yuv420p -t ${totalVideoDuration} "${normalizeForCmd(outputFile)}"`;

            console.log("Iniciando FFmpeg (con CWD y lista ordenada)...");
            console.log("Comando: ", cmdString);
            
            SLIDESHOW.currentFFmpegProcess = spawn(cmdString, { 
                shell: true,
                cwd: folder // Usamos la carpeta raíz guardada
            });


            // --- MANEJO COMÚN DE SALIDA Y ERRORES (MEJORADO) ---
            SLIDESHOW.currentFFmpegProcess.stderr.on('data', (data) => {

                const text = data.toString();
                // Buscamos el tiempo actual en el log de FFmpeg
                const match = text.match(/time=(\d{2}:\d{2}:\d{2}\.\d{2})/);
                if (match && match[1]) {
                    const currentSeconds = CAOBA.FN.timeToSeconds(match[1]);
                    let percent = (currentSeconds / totalVideoDuration) * 100;
                    percent = Math.min(Math.round(percent), 99); // Limitar a 99%

                    // === NUEVO: CÁLCULO DEL FICHERO ACTUAL ===
                    // Calculamos el índice aproximado basado en el progreso actual.
                    // Usamos Math.floor para obtener el índice entero (0, 1, 2...).
                    let currentIndex = Math.floor((currentSeconds / totalVideoDuration) * files.length);
                    
                    // Aseguramos que el índice no se salga del array (por si el tiempo se pasa un poco)
                    currentIndex = Math.min(currentIndex, files.length - 1);
                    
                    // Obtenemos el nombre del fichero usando la lista ordenada 'files'
                    // Usamos path.basename para mostrar solo "foto.jpg" y no toda la ruta "C:/Users/..."
                    const currentFileName = path.basename(files[currentIndex]);

                    // CAMBIO IMPORTANTE: Ahora enviamos un OBJETO con dos datos
                    CAOBA.mainWindow.webContents.send('conversion:progress', {
                        percent: percent,
                        file: currentFileName
                    });
                    // ==========================================
                };
            });

            SLIDESHOW.currentFFmpegProcess.on('close', (code) => {

                console.log(`Proceso FFmpeg terminado con codigo: ${code}`);
                SLIDESHOW.currentFFmpegProcess = null;
               // if (fs.existsSync(filterScriptFile)) try { fs.unlinkSync(filterScriptFile); } catch(e){}

                if (CAOBA.isCancelled) {
                    resolve({ success: false, error: "Cancelado por el usuario.", cancelado: true });
                } else if (code === 0) {
                    resolve({ success: true, path: outputFile });
                } else {
                    resolve({ success: false, error: "Error técnico en el motor de video. Revisa la consola de desarrollo para detalles." });
                };

            });

            SLIDESHOW.currentFFmpegProcess.on('error', (err) => {
                SLIDESHOW.currentFFmpegProcess = null;
                 if (!CAOBA.isCancelled) resolve({ success: false, error: err.message });
            });

        } catch (err) {
            SLIDESHOW.currentFFmpegProcess = null;
            resolve({ success: false, error: err.message });
        };

    });
});


// ==================================================================
//  RESIZER
// ==================================================================
ipcMain.handle('action:resizer-generate', async (event, folderPath, dimensionStr, saveMode) => {
    console.log(`Iniciando redimensionado en: ${folderPath}. Dim: ${dimensionStr}px. Modo: ${saveMode}`);
    
    CAOBA.isCancelled = false;

    try {
        const dimension = parseInt(dimensionStr);
        if (isNaN(dimension) || dimension < 10) throw new Error("Dimensión no válida");

        const jpgFiles = CAOBA.currentSortedFiles;
        
        let processedCount = 0;
        const totalFiles = jpgFiles.length;

        for (let i = 0; i < totalFiles; i++) {

            if (CAOBA.isCancelled) {
                console.log("Cancelación detectada dentro del bucle de redimensionado.");
                // Lanzamos un error específico que capturaremos abajo
                throw new Error("Cancelado por el usuario.");
            };

            const fileName = jpgFiles[i];
            const inputFilePath = path.join(folderPath, fileName);
            console.log(`Procesando: ${fileName}...`);

            // Calculamos el porcentaje actual
            const percent = Math.round(((i + 1) / totalFiles) * 100);
            
            // Enviamos el mensaje a la ventana principal
            CAOBA.mainWindow.webContents.send('conversion:progress', {
                file: fileName, // El nombre del fichero actual
                percent: percent // El porcentaje completado
            });

            const metadataOptions = {};
            const tiffTags = {}; // Usaremos el bloque 'tiff', que acepta strings
            tiffTags.Artist = "CAOBA Image Resizer";
            tiffTags.Copyright = "CAOBA Image Resizer";
            metadataOptions.tiff = tiffTags;

            // --- LÓGICA CONDICIONAL SEGÚN EL MODO ---
            if (saveMode === 'new') {

                // === MODO SEGURO: CREAR COPIA ===
                // 1. Calcular nuevo nombre (ej: imagen.jpg -> imagen_resized.jpg)
                const ext = path.extname(fileName); // .jpg
                const namePart = path.basename(fileName, ext); // imagen
                const newFileName = `${namePart}_resized${ext}`;
                const outputFilePath = path.join(folderPath, newFileName);

                // 2. Procesar y guardar directamente al nuevo nombre. No hay que borrar nada.
                let sharpInstance = sharp(inputFilePath)
                    .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true });


                    sharpInstance = sharpInstance.withMetadata({ exif: metadataOptions });
                    
                   await sharpInstance.jpeg({ quality: 90 })
                    .toFile(outputFilePath);

            } else {

                 // === MODO DESTRUCTIVO: SOBRESCRIBIR (La lógica anterior) ===
                 const tempOutputFilePath = path.join(folderPath, `temp_${fileName}`);
                 
                 // 1. Guardar en temporal
                 await sharp(inputFilePath)
                     .resize({ width: dimension, height: dimension, fit: 'inside', withoutEnlargement: true })
                     .jpeg({ quality: 90 })
                     .toFile(tempOutputFilePath);

                 // 2. "Baile" de sustitución
                 await fsPromises.unlink(inputFilePath); // Borrar original
                 await fsPromises.rename(tempOutputFilePath, inputFilePath); // Renombrar temporal
            };
            
            processedCount++;
        
        };

        const modeText = saveMode === 'new' ? 'creadas como copias nuevas' : 'sobrescritas';
        return { success: true, message: `Se han procesado ${processedCount} imágenes (${modeText}).` };

    } catch (error) {

        if (error.message === "Cancelado por el usuario.") return { success: false, error: "Cancelado por el usuario." };

        console.error("Error en redimensionado:", error);
        // Limpieza de temporales (solo necesaria si se usó el modo overwrite y falló a medias)
        try {
          const files = await fsPromises.readdir(folderPath);
          for (const f of files) { 
            if (f.startsWith('temp_')) await fsPromises.unlink(path.join(folderPath, f));
          };
        } catch(e) {};

        return { success: false, error: `Error técnico: ${error.message}` };

    };

});