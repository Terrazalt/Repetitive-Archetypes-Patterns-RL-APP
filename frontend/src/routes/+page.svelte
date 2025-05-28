<script lang="ts">
	import { onMount } from 'svelte';

	let open = false;
	let openCNN = false;
	let icons: string[] = [];
	let selectedImage: string | null = null;
	let scan = false;

	let imageEl: HTMLImageElement;
	let canvasEl: HTMLCanvasElement;

	let isSelecting = false;
	let selectStartX = 0,
		selectStartY = 0,
		selectEndX = 0,
		selectEndY = 0;
	let croppedImage: string | null = null;

	let detections: {
		xyxy: [[number, number, number, number]];
		confidence: number;
		class_id: number;
		label: string;
		manual?: boolean;
	}[] = [];
	let imageNaturalWidth = 1,
		imageNaturalHeight = 1;
	let imageDisplayWidth = 1,
		imageDisplayHeight = 1;
	let draggingIdx: number | null = null;
	let resizingIdx: number | null = null;
	let dragOffset = { x: 0, y: 0 };
	let resizeStart = { x: 0, y: 0, boxW: 0, boxH: 0 };
	let exportWithBoxes = false; // <-- Switch de exportación

	const YOLO_API_KEY = import.meta.env.VITE_YOLO_API_KEY;
	const YOLO_ENDPOINT = import.meta.env.VITE_YOLO_ENDPOINT;
	const BOUNDING_BOXES_ENDPOINT = import.meta.env.VITE_BOUNDING_BOXES_ENDPOINT;

	// -------- Bounding boxes: drag, resize, crear --------
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
		const minW = 10,
			minH = 10;
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
				{
					xyxy: [[x0, y0, x1, y1]],
					confidence: 1,
					class_id: 0,
					label,
					manual: true
				}
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
		let box = det.xyxy[0];
		const w = box[2] - box[0];
		const h = box[3] - box[1];
		let newLeftPx = e.clientX - dragOffset.x;
		let newTopPx = e.clientY - dragOffset.y;
		let newLeft = (newLeftPx / imageDisplayWidth) * imageNaturalWidth;
		let newTop = (newTopPx / imageDisplayHeight) * imageNaturalHeight;
		let newRight = newLeft + w;
		let newBottom = newTop + h;
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
		let box = det.xyxy[0];
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
	// --- Eliminar bounding box ---
	function deleteBox(idx: number) {
		detections = detections.slice(0, idx).concat(detections.slice(idx + 1));
	}
	// --- Imagen, API, etc ---
	function handleFileChange(event: Event): void {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				selectedImage = e.target.result as string;
				croppedImage = null;
				scan = false;
				detections = [];
			};
			reader.readAsDataURL(file);
		}
	}
	async function detectBoxes() {
		if (!selectedImage) return;
		const blob = await (await fetch(selectedImage)).blob();
		const form = new FormData();
		form.append('image', blob, 'scan.png');
		const res = await fetch(BOUNDING_BOXES_ENDPOINT, {
			method: 'POST',
			headers: { Authorization: `Bearer ${YOLO_API_KEY}` },
			body: form
		});
		if (!res.ok) {
			alert('Error bounding box API');
			return;
		}
		detections = await res.json();
	}
	function handleClick() {
		if (selectedImage) scan = true;
		else alert('No image selected');
	}
	onMount(async () => {
		try {
			const res = await fetch('/api/icons');
			if (!res.ok) throw new Error(`Error fetching icons: ${res.statusText}`);
			icons = await res.json();
		} catch (err) {
			console.error('Failed to load icons:', err);
		}
	});

	async function exportImageAndBoxes() {
		if (!imageEl) return;
		const canvas = document.createElement('canvas');
		canvas.width = imageNaturalWidth;
		canvas.height = imageNaturalHeight;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;
		ctx.drawImage(imageEl, 0, 0, canvas.width, canvas.height);

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
		canvas.toBlob((blob) => {
			if (blob) {
				const url = URL.createObjectURL(blob);
				const a = document.createElement('a');
				a.href = url;
				a.download = exportWithBoxes ? 'bounding_boxes.png' : 'image_clean.png';
				a.click();
				URL.revokeObjectURL(url);
			}
		}, 'image/png');

		const coco = {
			images: [
				{
					id: 1,
					file_name: exportWithBoxes ? 'bounding_boxes.png' : 'image_clean.png',
					width: imageNaturalWidth,
					height: imageNaturalHeight
				}
			],
			annotations: detections.map((det, i) => {
				const [x0, y0, x1, y1] = det.xyxy[0];
				return {
					id: i + 1,
					image_id: 1,
					category_id: det.class_id ?? 0,
					bbox: [x0, y0, x1 - x0, y1 - y0],
					area: (x1 - x0) * (y1 - y0),
					iscrowd: 0,
					label: det.label
				};
			}),
			categories: [
				...Array.from(new Set(detections.map((d) => d.label))).map((l, idx) => ({
					id: idx,
					name: l
				}))
			]
		};
		const blob2 = new Blob([JSON.stringify(coco, null, 2)], { type: 'application/json' });
		const url2 = URL.createObjectURL(blob2);
		const a2 = document.createElement('a');
		a2.href = url2;
		a2.download = 'bounding_boxes.json';
		a2.click();
		URL.revokeObjectURL(url2);
	}
</script>

<header class="bg-amber-600 p-4 text-white">
	<div class="relative container mx-auto flex items-center justify-between">
		<h1 class="text-xl font-bold">Repetitive Archetypes Patterns Detector</h1>
		<button on:click={() => (openCNN = !openCNN)}>
			<span class="text-2xl">☰</span>
		</button>
		{#if openCNN}
			<div
				class="absolute right-0 z-10 mt-2 w-29 rounded bg-white text-black shadow-lg"
				style="top: 100%;"
			>
				<button class="py2 block px-4 hover:bg-amber-400" on:click={() => alert('CNN Model')}
					>CNN Model</button
				>
				<button class="py2 block px-4 hover:bg-amber-400" on:click={() => alert('Yolo Model')}
					>Yolo Model</button
				>
				<button class="py2 block px-4 hover:bg-amber-400" on:click={() => (openCNN = false)}
					>Close</button
				>
			</div>
		{/if}
	</div>
</header>

<main class="flex flex-row justify-center space-x-8 py-10">
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
					<div
						class="group absolute cursor-move border-2 border-red-500 bg-red-500/10 transition-all duration-200"
						style="
				left: {(det.xyxy[0][0] * imageDisplayWidth) / imageNaturalWidth}px;
				top: {(det.xyxy[0][1] * imageDisplayHeight) / imageNaturalHeight}px;
				width: {((det.xyxy[0][2] - det.xyxy[0][0]) * imageDisplayWidth) / imageNaturalWidth}px;
				height: {((det.xyxy[0][3] - det.xyxy[0][1]) * imageDisplayHeight) / imageNaturalHeight}px;
				z-index: 30;"
						on:mousedown={(e) => startDrag(e, idx)}
					>
						<!-- Botón eliminar dentro del bounding box -->
						<button
							class="absolute top-0 right-0 m-0.5 flex h-6 w-6 items-center justify-center rounded-full border border-red-500 bg-white/90 font-bold text-red-600 opacity-60 transition group-hover:opacity-100"
							title="Eliminar bounding box"
							on:click|stopPropagation={() => deleteBox(idx)}>×</button
						>
						<div
							class="absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize rounded-br bg-red-500 opacity-40 group-hover:opacity-80"
							style="z-index: 40;"
							on:mousedown|preventDefault={(e) => startResize(e, idx)}
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

		<div class="relative mt-4 flex flex-col items-center space-y-2">
			<button
				on:click={detectBoxes}
				class="rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
			>
				Scan Image
			</button>
			<div class="mb-3 flex items-center">
				<label class="mr-2 font-bold">¿Incluir boxes en la imagen exportada?</label>
				<input type="checkbox" bind:checked={exportWithBoxes} class="h-5 w-5 accent-fuchsia-700" />
				<span class="ml-1">{exportWithBoxes ? 'Sí, incluir' : 'No, solo imagen limpia'}</span>
			</div>
			<button
				on:click={exportImageAndBoxes}
				class="rounded bg-fuchsia-700 px-4 py-2 font-bold text-white hover:bg-fuchsia-900"
			>
				Exportar (PNG + COCO)
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
						<div
							class="absolute right-0 z-20 mt-2 max-h-60 w-52 overflow-y-auto rounded border bg-white text-black shadow-lg"
						>
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
								title="Eliminar bounding box">🗑️</button
							>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</main>
