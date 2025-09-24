<script lang="ts">
    import { onMount } from 'svelte';
    import { env } from '$lib/env';

    // --- Estado UI ---
    let open = false;
    let sideMenuOpen = false;
    let selectedModel: 'YOLO' | 'RetinaNet' = 'YOLO';
    let icons: string[] = [];
    let selectedImage: string | null = null;
    let scan = false;

    let imageEl: HTMLImageElement;
    let canvasEl: HTMLCanvasElement;

    // --- Selección y recorte ---
    let isSelecting = false;
    let selectStartX = 0, selectStartY = 0, selectEndX = 0, selectEndY = 0;
    let croppedImage: string | null = null;

    // --- Detecciones ---
    let detections: {
        xyxy: [[number, number, number, number]];
        confidence: number;
        class_id: number;
        label: string;
        manual?: boolean;
    }[] = [];

    // --- Geometría imagen ---
    let imageNaturalWidth = 1, imageNaturalHeight = 1;
    let imageDisplayWidth = 1, imageDisplayHeight = 1;

    // --- Drag/resize boxes ---
    let draggingIdx: number | null = null;
    let resizingIdx: number | null = null;
    let dragOffset = { x: 0, y: 0 };
    let resizeStart = { x: 0, y: 0, boxW: 0, boxH: 0 };

    // Exportar imagen con o sin boxes dibujados
    let exportWithBoxes = false;

    // ================== ENV (via @t3-oss/env-core) ==================
    // YOLO (preferimos VITE_*, ya están definidas así en env.ts)
    const YOLO_API_KEY = env.VITE_YOLO_API_KEY;
    const YOLO_ENDPOINT = env.VITE_YOLO_ENDPOINT; // (por si lo necesitas en el futuro)
    const BOUNDING_BOXES_ENDPOINT = env.VITE_BOUNDING_BOXES_ENDPOINT;
    const ADD_IMAGE_ENDPOINT = env.VITE_YOLO_ADD_TRAIN_IMAGE;
    const RETRAIN_ENDPOINT = env.VITE_YOLO_RETRAIN;

    // RetinaNet (probamos nombre principal y alias de boxes)
    const RETINANET_ADD_IMAGE_ENDPOINT =
        env.VITE_RETINANET_ADD_TRAIN_IMAGE;

    const RETINANET_BOUNDING_BOXES_ENDPOINT =
        env.VITE_RETINANET_BOUNDING_BOXES_ENDPOINT ||
        env.VITE_BOUNDING_BOXES_RETINANET_ENDPOINT;

    const RETINANET_RETRAIN_ENDPOINT =
        env.VITE_RETINANET_RETRAIN;

    // ================== DEBUG LOGGING ==================
    type LogLevel = 'info' | 'error';
    type LogEntry = { ts: string; level: LogLevel; msg: string };
    let debugLogs: LogEntry[] = [];

    function log(level: LogLevel, msg: string) {
        const ts = new Date().toISOString();
        debugLogs = [{ ts, level, msg }, ...debugLogs].slice(0, 300);
        const p = level === 'error' ? '[UI][ERROR]' : '[UI][INFO]';
        (level === 'error' ? console.error : console.log)(`${p} ${msg}`);
    }
    const logInfo = (m: string) => log('info', m);
    const logError = (m: string) => log('error', m);

    async function checkUrl(url: string, method: string = 'GET') {
        logInfo(`Ping ${method} ${url}`);
        try {
            const res = await fetch(url, { method });
            logInfo(`↳ status ${res.status} ${res.statusText}`);
            let text = '';
            try { text = await res.text(); } catch {}
            if (text) logInfo(`↳ body[0..200]: ${text.slice(0, 200).replace(/\n/g, ' ')}${text.length > 200 ? '…' : ''}`);
            return res;
        } catch (e) {
            logError(`↳ network error: ${e}`);
            throw e;
        }
    }
    async function testEndpoints() {
        logInfo(`Testing endpoints para ${selectedModel}`);
        try { await checkUrl(endpoints.retrainEndpoint, 'GET'); } catch {}
        try { await checkUrl(endpoints.addImageEndpoint, 'GET'); } catch {}
        try { await checkUrl(endpoints.boundingBoxesEndpoint, 'GET'); } catch {}
        logInfo('Endpoint test finished');
    }

    // ================== ENDPOINTS SELECCIONADOS ==================
    type Endpoints = { retrainEndpoint: string; addImageEndpoint: string; boundingBoxesEndpoint: string };
    let endpoints: Endpoints = {
        retrainEndpoint: RETRAIN_ENDPOINT,
        addImageEndpoint: ADD_IMAGE_ENDPOINT,
        boundingBoxesEndpoint: BOUNDING_BOXES_ENDPOINT
    };

    // Fallback POR CAMPO: si falta uno de RetinaNet, cae a su par de YOLO, no al bloque completo.
    $: {
        const useYolo = selectedModel === 'YOLO';
        endpoints = {
            retrainEndpoint: useYolo ? RETRAIN_ENDPOINT : (RETINANET_RETRAIN_ENDPOINT || RETRAIN_ENDPOINT),
            addImageEndpoint: useYolo ? ADD_IMAGE_ENDPOINT : (RETINANET_ADD_IMAGE_ENDPOINT || ADD_IMAGE_ENDPOINT),
            boundingBoxesEndpoint: useYolo ? BOUNDING_BOXES_ENDPOINT : (RETINANET_BOUNDING_BOXES_ENDPOINT || BOUNDING_BOXES_ENDPOINT)
        };
    }
    $: logInfo(`Red neuronal activa: ${selectedModel} | endpoints=` + JSON.stringify(endpoints));

    // ================== BOUNDING BOXES: seleccionar, arrastrar, redimensionar ==================
    function startSelection(event: MouseEvent) {
        if (event.target !== canvasEl) return;
        const rect = canvasEl.getBoundingClientRect();
        isSelecting = true;
        selectStartX = selectEndX = event.clientX - rect.left;
        selectStartY = selectEndY = event.clientY - rect.top;
    }
    function updateSelection(event: MouseEvent) {
        if (!isSelecting) return;
        const rect = canvasEl.getBoundingClientRect();
        selectEndX = event.clientX - rect.left;
        selectEndY = event.clientY - rect.top;
        drawSelection();
    }
    function endSelection() {
        if (!isSelecting) return;
        isSelecting = false;
        const minW = 10, minH = 10;
        const w = Math.abs(selectEndX - selectStartX);
        const h = Math.abs(selectEndY - selectStartY);
        if (w >= minW && h >= minH) {
            const scaleX = imageEl.naturalWidth / imageEl.clientWidth;
            const scaleY = imageEl.naturalHeight / imageEl.clientHeight;
            const x0 = Math.min(selectStartX, selectEndX) * scaleX;
            const y0 = Math.min(selectStartY, selectEndY) * scaleY;
            const x1 = Math.max(selectStartX, selectEndX) * scaleX;
            const y1 = Math.max(selectStartY, selectEndY) * scaleY;
            const label = prompt('Label del bounding box:', 'manual_box') || 'manual_box';
            detections = [
                ...detections,
                { xyxy: [[x0, y0, x1, y1]], confidence: 1, class_id: 0, label, manual: true }
            ];
        }
        clearSelection();
    }
    function drawSelection() {
        if (!isSelecting) return;
        const ctx = canvasEl.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
        ctx.drawImage(imageEl, 0, 0, canvasEl.width, canvasEl.height);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.strokeRect(
            Math.min(selectStartX, selectEndX),
            Math.min(selectStartY, selectEndY),
            Math.abs(selectEndX - selectStartX),
            Math.abs(selectEndY - selectStartY)
        );
    }
    function clearSelection() {
        const ctx = canvasEl.getContext('2d');
        if (ctx && imageEl) {
            ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
            ctx.drawImage(imageEl, 0, 0, canvasEl.width, canvasEl.height);
        }
    }

    function startDrag(e: MouseEvent, idx: number) {
        draggingIdx = idx;
        const box = detections[idx].xyxy[0];
        dragOffset.x = e.clientX - (box[0] * imageDisplayWidth) / imageNaturalWidth;
        dragOffset.y = e.clientY - (box[1] * imageDisplayHeight) / imageNaturalHeight;
        window.addEventListener('mousemove', dragBox);
        window.addEventListener('mouseup', stopDrag);
    }
    function dragBox(e: MouseEvent) {
        if (draggingIdx === null) return;
        const det = detections[draggingIdx];
        const box = det.xyxy[0];
        const w = box[2] - box[0];
        const h = box[3] - box[1];
        const newLeftPx = e.clientX - dragOffset.x;
        const newTopPx = e.clientY - dragOffset.y;
        const newLeft = (newLeftPx / imageDisplayWidth) * imageNaturalWidth;
        const newTop = (newTopPx / imageDisplayHeight) * imageNaturalHeight;
        const newRight = newLeft + w;
        const newBottom = newTop + h;
        det.xyxy[0] = [newLeft, newTop, newRight, newBottom];
        detections = [...detections];
    }
    function stopDrag() {
        draggingIdx = null;
        window.removeEventListener('mousemove', dragBox);
        window.removeEventListener('mouseup', stopDrag);
    }

    function startResize(e: MouseEvent, idx: number) {
        e.stopPropagation();
        resizingIdx = idx;
        const box = detections[idx].xyxy[0];
        resizeStart.x = e.clientX;
        resizeStart.y = e.clientY;
        resizeStart.boxW = box[2] - box[0];
        resizeStart.boxH = box[3] - box[1];
        window.addEventListener('mousemove', resizeBox);
        window.addEventListener('mouseup', stopResize);
    }
    function resizeBox(e: MouseEvent) {
        if (resizingIdx === null) return;
        const det = detections[resizingIdx];
        let deltaX = (e.clientX - resizeStart.x) * (imageNaturalWidth / imageDisplayWidth);
        let deltaY = (e.clientY - resizeStart.y) * (imageNaturalHeight / imageDisplayHeight);
        let newW = Math.max(10, resizeStart.boxW + deltaX);
        let newH = Math.max(10, resizeStart.boxH + deltaY);
        det.xyxy[0][2] = det.xyxy[0][0] + newW;
        det.xyxy[0][3] = det.xyxy[0][1] + newH;
        detections = [...detections];
    }
    function stopResize() {
        resizingIdx = null;
        window.removeEventListener('mousemove', resizeBox);
        window.removeEventListener('mouseup', stopResize);
    }

    function deleteBox(idx: number) {
        detections = detections.slice(0, idx).concat(detections.slice(idx + 1));
    }

    // ================== Imagen / API ==================
    function handleFileChange(event: Event): void {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                selectedImage = e.target?.result as string;
                croppedImage = null;
                scan = false;
                detections = [];
            };
            reader.readAsDataURL(file);
        }
    }

    async function detectBoxes() {
        if (!selectedImage) {
            alert('No image selected');
            logError('detectBoxes called with no selectedImage');
            return;
        }
        const blob = await (await fetch(selectedImage)).blob();
        const form = new FormData();
        form.append('image', blob, 'scan.png');
        logInfo(`Calling boundingBoxesEndpoint: ${endpoints.boundingBoxesEndpoint}`);
        try {
            const res = await fetch(endpoints.boundingBoxesEndpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${YOLO_API_KEY}` },
                body: form
            });
            logInfo(`boundingBoxesEndpoint responded ${res.status} ${res.statusText}`);
            if (!res.ok) {
                const t = await res.text().catch(() => '');
                logError(`boundingBoxesEndpoint error body: ${t.slice(0, 300)}`);
                alert('Error bounding box API');
                return;
            }
            detections = await res.json();
            logInfo(`Received ${detections.length} detections`);
            scan = true;
        } catch (err) {
            logError(`boundingBoxesEndpoint network error: ${err}`);
            alert('Error bounding box API');
        }
    }

    function handleClick() {
        if (selectedImage) scan = true;
        else alert('No image selected');
    }

    onMount(async () => {
        try {
            logInfo('Fetching /api/icons');
            const res = await fetch('/api/icons');
            if (!res.ok) throw new Error(`Error fetching icons: ${res.statusText}`);
            logInfo(`/api/icons responded ${res.status} ${res.statusText}`);
            icons = await res.json();
        } catch (err) {
            logError('Failed to load icons: ' + err);
            console.error('Failed to load icons:', err);
        }
    });

    async function onClickExportDownloadAndUpload() {
        if (!imageEl) return;

        // 1. Render canvas
        const canvas = document.createElement('canvas');
        canvas.width = imageNaturalWidth;
        canvas.height = imageNaturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

        // Dibuja bounding boxes si corresponde
        if (exportWithBoxes) {
            ctx.save();
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'red';
            detections.forEach((det) => {
                const [x0, y0, x1, y1] = det.xyxy[0];
                ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
            });
            ctx.restore();
        }

        // 2. Canvas a blob para imagen
        const imageBlob: Blob = await new Promise((resolve) =>
            canvas.toBlob((blob) => resolve(blob!), 'image/png')
        );
        const imageFileName = exportWithBoxes ? 'bounding_boxes.png' : 'image_clean.png';

        // 3. Descarga la imagen renderizada al usuario
        const imageUrl = URL.createObjectURL(imageBlob);
        const a = document.createElement('a');
        a.href = imageUrl;
        a.download = imageFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(imageUrl);

        // 4. Construye COCO JSON
        const labels = Array.from(new Set(detections.map((d) => d.label)));
        const label2id = Object.fromEntries(labels.map((l, idx) => [l, idx]));
        const categories = labels.map((l, idx) => ({ id: idx, name: l }));
        const annotations = detections.map((det, i) => {
            const [x0, y0, x1, y1] = det.xyxy[0];
            return {
                id: i + 1,
                image_id: 1,
                category_id: label2id[det.label],
                bbox: [x0, y0, x1 - x0, y1 - y0],
                area: (x1 - x0) * (y1 - y0),
                iscrowd: 0,
                label: det.label
            };
        });
        const coco = {
            images: [{ id: 1, file_name: imageFileName, width: imageNaturalWidth, height: imageNaturalHeight }],
            annotations,
            categories
        };

        // 5. Descarga COCO
        const cocoBlob = new Blob([JSON.stringify(coco, null, 2)], { type: 'application/json' });
        const cocoUrl = URL.createObjectURL(cocoBlob);
        const a2 = document.createElement('a');
        a2.href = cocoUrl;
        a2.download = imageFileName.replace('.png', '.json');
        document.body.appendChild(a2);
        a2.click();
        a2.remove();
        URL.revokeObjectURL(cocoUrl);

        // 6. FormData para upload
        const formData = new FormData();
        formData.append('image', imageBlob, imageFileName);
        formData.append('COCO_json', JSON.stringify(coco));

        // 7. Upload
        try {
            logInfo(`Uploading image + COCO to: ${endpoints.addImageEndpoint}`);
            const response = await fetch(endpoints.addImageEndpoint, {
                method: 'POST',
                headers: { Authorization: `Bearer ${YOLO_API_KEY}` },
                body: formData
            });
            logInfo(`addImageEndpoint responded ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const error = await response.text();
                logError('Upload error: ' + error.slice(0, 300));
                alert('Error subiendo a Roboflow: ' + error);
                return;
            }

            const data = await response.json();
            logInfo('Upload OK: ' + JSON.stringify(data).slice(0, 300));
            alert('Subido a Roboflow: ' + JSON.stringify(data));
        } catch (err) {
            logError('Upload network error: ' + err);
            alert('Error en la petición: ' + err);
        }
    }

    async function fetchRetrain() {
        logInfo(`Requesting retrain to: ${endpoints.retrainEndpoint}`);
        try {
            const response = await fetch(endpoints.retrainEndpoint, { method: 'GET' });
            logInfo(`retrainEndpoint responded ${response.status} ${response.statusText}`);
            if (!response.ok) {
                const t = await response.text().catch(() => '');
                logError(`Retrain error body: ${t.slice(0, 300)}`);
                alert('Error al solicitar reentrenamiento: ' + response.statusText);
                return;
            }
            alert('Reentrenamiento solicitado correctamente');
        } catch (e) {
            logError(`Retrain network error: ${e}`);
            alert('Error al solicitar reentrenamiento: ' + e);
        }
    }
</script>

{#if sideMenuOpen}
    <!-- Overlay -->
    <div
            class="fixed inset-0 bg-black bg-opacity-50 z-40"
            on:click={() => sideMenuOpen = false}
    ></div>
{/if}

<!-- Panel lateral -->
<div class="fixed top-0 left-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 {sideMenuOpen ? 'translate-x-0' : '-translate-x-full'}">
    <div class="p-6">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-xl font-semibold text-gray-800">Seleccionar Modelo</h2>
            <button on:click={() => sideMenuOpen = false} class="text-gray-500 hover:text-gray-700 text-2xl">×</button>
        </div>

        <div class="space-y-3">
            <button
                    class="w-full text-left px-4 py-3 rounded-lg transition-colors {selectedModel === 'YOLO' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}"
                    on:click={() => {selectedModel = 'YOLO'; sideMenuOpen = false;}}
            >
                <div class="font-medium">YOLO</div>
                <div class="text-sm opacity-75">You Only Look Once</div>
            </button>

            <div class="border-t border-gray-200 my-2"></div>

            <button
                    class="w-full text-left px-4 py-3 rounded-lg transition-colors {selectedModel === 'RetinaNet' ? 'bg-blue-100 text-blue-700 border-2 border-blue-300' : 'bg-gray-50 hover:bg-gray-100 text-gray-700'}"
                    on:click={() => {selectedModel = 'RetinaNet'; sideMenuOpen = false;}}
            >
                <div class="font-medium">RetinaNet</div>
                <div class="text-sm opacity-75">Focal Loss for Dense Object Detection</div>
            </button>
        </div>
    </div>
</div>

<!-- Banner de red activa -->
<div class="mx-auto mb-4 max-w-6xl rounded border bg-blue-50 p-3 text-sm text-blue-900">
    <span class="font-semibold">Red neuronal activa:</span> {selectedModel}
    <div class="mt-1 text-[12px] opacity-80">
        <span class="font-medium">retrain:</span> {endpoints.retrainEndpoint} ·
        <span class="font-medium">addImage:</span> {endpoints.addImageEndpoint} ·
        <span class="font-medium">boxes:</span> {endpoints.boundingBoxesEndpoint}
    </div>
</div>

<main class="flex flex-row justify-center space-x-8 py-10">
    <!-- Botón para abrir menú lateral -->
    <div class="fixed top-20 left-4 z-30">
        <button
                on:click={() => sideMenuOpen = true}
                class="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm shadow-lg"
        >
            <span>🤖</span>
            <span>{selectedModel}</span>
        </button>
    </div>

    <div class="flex flex-col items-center gap-8">
        <div class="relative w-[1080px]">
            <img
                    bind:this={imageEl}
                    src={selectedImage || '/image.png'}
                    alt="Imagen para recorte"
                    class="h-auto w-full rounded shadow"
                    on:load={() => {
					if (canvasEl && imageEl) {
						canvasEl.width = imageEl.clientWidth;
						canvasEl.height = imageEl.clientHeight;
						imageDisplayWidth = imageEl.clientWidth;
						imageDisplayHeight = imageEl.clientHeight;
						imageNaturalWidth = imageEl.naturalWidth;
						imageNaturalHeight = imageEl.naturalHeight;
						clearSelection();
					}
				}}
            />
            <canvas
                    bind:this={canvasEl}
                    class="absolute top-0 left-0 z-10"
                    style="pointer-events: all"
                    on:mousedown={startSelection}
                    on:mousemove={updateSelection}
                    on:mouseup={endSelection}
            ></canvas>

            {#each detections as det, idx}
                {#if det.xyxy && det.xyxy[0]}
                    <!-- svelte-ignore a11y_no_static_element_interactions -->
                    <div
                            class="group absolute cursor-move border-2 border-red-500 bg-red-500/10 transition-all duration-200"
                            style="
							left: {(det.xyxy[0][0] * imageDisplayWidth) / imageNaturalWidth}px;
							top: {(det.xyxy[0][1] * imageDisplayHeight) / imageNaturalHeight}px;
							width: {((det.xyxy[0][2] - det.xyxy[0][0]) * imageDisplayWidth) / imageNaturalWidth}px;
							height: {((det.xyxy[0][3] - det.xyxy[0][1]) * imageDisplayHeight) / imageNaturalHeight}px;
							z-index: 30;"
                            on:mousedown={(e) => startDrag(e, idx)}
                            role="button"
                            tabindex="0"
                            aria-label={`Mover bounding box ${idx+1}`}
                    >
                        <!-- Botón eliminar -->
                        <button
                                class="absolute top-0 right-0 m-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-red-500 bg-white/90 font-bold text-red-600 opacity-60 transition group-hover:opacity-100"
                                title="Eliminar bounding box"
                                on:click|stopPropagation={() => deleteBox(idx)}
                        >×</button>

                        <div
                                class="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize rounded-br bg-red-500 opacity-40 group-hover:opacity-80"
                                style="z-index: 40;"
                                on:mousedown|preventDefault={(e) => startResize(e, idx)}
                                role="button"
                                tabindex="0"
                                aria-label={`Redimensionar bounding box ${idx+1}`}
                        ></div>
                    </div>
                {/if}
            {/each}
        </div>

        {#if croppedImage}
            <div class="text-center">
                <h2 class="mb-2 font-semibold">Imagen recortada:</h2>
                <img src={croppedImage} alt="Recorte" class="max-w-[200px] rounded border shadow" />
            </div>
        {/if}

        <input
                type="file"
                accept="image/*"
                on:change={handleFileChange}
                class="mb-6 rounded border px-4 py-2"
        />

        <div class="relative mt-4 flex flex-col items-center">
            <button
                    on:click={detectBoxes}
                    class="rounded bg-emerald-600 px-4 py-4 font-bold text-white hover:bg-emerald-700"
            >
                Scan Image
            </button>

            <button
                    on:click={testEndpoints}
                    class="mt-2 rounded bg-gray-700 px-4 py-2 font-bold text-white hover:bg-gray-800"
                    aria-label="Probar conectividad de endpoints"
            >
                Probar endpoints
            </button>

            {#if scan}
                <div class="relative">
                    <button
                            class="rounded border bg-white px-4 py-2 text-black hover:bg-gray-100"
                            on:click={() => (open = !open)}
                    >
                        Seleccionar Imagen
                    </button>
                    {#if open}
                        <div class="absolute right-0 z-20 mt-2 max-h-60 w-52 overflow-y-auto rounded border bg-white text-black shadow-lg">
                            {#each icons as icon}
                                <button
                                        class="flex w-full justify-center px-4 py-2 hover:bg-gray-100"
                                        on:click={() => {
										selectedImage = icon;
										open = false;
										scan = false;
										croppedImage = null;
									}}
                                >
                                    <img src={icon} alt="icon" class="h-20 w-20 object-contain" />
                                </button>
                            {/each}
                        </div>
                    {/if}
                </div>
            {/if}
        </div>
    </div>

    <div class="min-w-[350px]">
        <h2 class="mb-2 text-lg font-bold text-gray-800">Etiquetas detectadas</h2>
        <table class="w-full border-collapse text-left">
            <thead>
            <tr>
                <th class="border-b-2 py-2">#</th>
                <th class="border-b-2 py-2">Label</th>
                <th class="border-b-2 py-2">Confianza</th>
                <th class="border-b-2 py-2">Manual?</th>
                <th class="border-b-2 py-2">Eliminar</th>
            </tr>
            </thead>
            <tbody>
            {#each detections as det, i}
                <tr class="hover:bg-gray-100">
                    <td class="py-1 pr-2">{i + 1}</td>
                    <td class="py-1 pr-2">{det.label}</td>
                    <td class="py-1">{Math.round(det.confidence * 100)}%</td>
                    <td class="py-1">{det.manual ? '✔️' : ''}</td>
                    <td class="py-1">
                        <button
                                class="rounded px-2 py-1 font-bold text-red-700 hover:bg-red-100"
                                on:click={() => deleteBox(i)}
                                title="Eliminar bounding box"
                        >🗑️</button>
                    </td>
                </tr>
            {/each}
            </tbody>
        </table>
    </div>
</main>

<details open class="mx-8 mt-4">
    <summary class="cursor-pointer select-none font-semibold">Debug logs</summary>
    <div class="mt-2 max-h-64 overflow-auto rounded border bg-black text-white">
        <ul class="text-xs leading-relaxed">
            {#each debugLogs as l}
                <li class="border-b border-white/10 px-3 py-1">
                    <span class="opacity-70">{l.ts}</span>
                    <span class="mx-2 rounded px-1 py-0.5 text-[10px] {l.level === 'error' ? 'bg-red-600' : 'bg-emerald-600'}">{l.level}</span>
                    <span class="break-words">{l.msg}</span>
                </li>
            {/each}
            {#if debugLogs.length === 0}
                <li class="px-3 py-2 opacity-70">(sin logs aún)</li>
            {/if}
        </ul>
    </div>
</details>