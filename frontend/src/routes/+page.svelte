<script lang="ts">
  import { onMount } from 'svelte';

  // -- Configure your CNN endpoint here --
  const CNN_ENDPOINT = 'http://127.0.0.1:8000/yolo/detect';

  let open = false;
  let openCNN = false;
  let icons: string[] = [];
  let selectedImage: string | null = null;
  let scan = false;

  let imageEl: HTMLImageElement;
  let canvasEl: HTMLCanvasElement;

  let isSelecting = false;
  let startX = 0;
  let startY = 0;
  let currentX = 0;
  let currentY = 0;

  let croppedImage: string | null = null;

  /**
   * Helper: send dataURL as multipart/form-data to CNN endpoint
   */
  async function sendAsFormData(dataUrl: string): Promise<Blob> {
    // 1) DataURL → Blob
    const blob = await (await fetch(dataUrl)).blob();
    // 2) wrap in FormData
    const form = new FormData();
    form.append('image', blob, 'scan.png');

    // 3) POST with Authorization header
    const res = await fetch(CNN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer K4inGvUkdkTsFmkSBU4WopYVqpdGN1GBEdvXy4lMxXM='
      },
      body: form
    });
    if (!res.ok) throw new Error(`CNN API Error: ${res.statusText}`);

    // 4) return processed image blob
    return await res.blob();
  }
  /**
   * Sends the (cropped or full) image via sendAsFormData,
   * then replaces the displayed image with the processed result.
   */
  async function processWithCNN(): Promise<void> {
    const dataUrl = croppedImage || selectedImage;
    if (!dataUrl) {
      alert('No image to scan');
      return;
    }

    try {
      const processedBlob = await sendAsFormData(dataUrl);
      selectedImage = URL.createObjectURL(processedBlob);
      croppedImage = null;
      scan = false;
    } catch (err) {
      console.error('CNN detect error:', err);
      alert('Error processing image');
    }
  }

  /** Trigger cropping & CNN processing */
  function handleClick(): void {
    if (selectedImage) {
      scan = true;
      processWithCNN();
    } else {
      alert('No image selected');
    }
  }

  function startSelection(event: MouseEvent) {
    if (scan) {
      const rect = canvasEl.getBoundingClientRect();
      startX = event.clientX - rect.left;
      startY = event.clientY - rect.top;
      currentX = startX;
      currentY = startY;
      isSelecting = true;
    }
  }

  function updateSelection(event: MouseEvent) {
    if (!isSelecting) return;
    const rect = canvasEl.getBoundingClientRect();
    currentX = event.clientX - rect.left;
    currentY = event.clientY - rect.top;
    drawSelection();
  }

  function endSelection() {
    if (!isSelecting) return;
    isSelecting = false;
    recortarImagen();
  }

  function drawSelection() {
    if (scan) {
      const ctx = canvasEl.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      ctx.drawImage(imageEl, 0, 0, canvasEl.width, canvasEl.height);
      ctx.strokeStyle = 'red';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    }
  }

  function recortarImagen() {
    const width = currentX - startX;
    const height = currentY - startY;

    const scaleX = imageEl.naturalWidth / imageEl.clientWidth;
    const scaleY = imageEl.naturalHeight / imageEl.clientHeight;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = Math.abs(width * scaleX);
    tempCanvas.height = Math.abs(height * scaleY);

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(
      imageEl,
      Math.min(startX, currentX) * scaleX,
      Math.min(startY, currentY) * scaleY,
      Math.abs(width) * scaleX,
      Math.abs(height) * scaleY,
      0,
      0,
      Math.abs(width) * scaleX,
      Math.abs(height) * scaleY
    );

    croppedImage = tempCanvas.toDataURL('image/png');
  }

  function handleFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target) {
          selectedImage = e.target.result as string;
          croppedImage = null;
          scan = false;
        }
      };
      reader.readAsDataURL(file);
    }
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
        <button class="py2 block px-4 hover:bg-amber-400" on:click={() => alert('CNN Model')}>CNN Model</button>
        <button class="py2 block px-4 hover:bg-amber-400" on:click={() => alert('Yolo Model')}>Yolo Model</button>
        <button class="py2 block px-4 hover:bg-amber-400" on:click={() => (openCNN = false)}>Close</button>
      </div>
    {/if}
  </div>
</header>

<main class="flex flex-col items-center justify-center space-y-6 py-10">
  <div class="flex items-start gap-8">
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
            drawSelection();
          }
        }}
      />
      <canvas
        bind:this={canvasEl}
        class="absolute top-0 left-0 z-10"
        on:mousedown={startSelection}
        on:mousemove={updateSelection}
        on:mouseup={endSelection}
      ></canvas>
    </div>

    {#if croppedImage}
      <div class="text-center">
        <h2 class="mb-2 font-semibold">Imagen recortada:</h2>
        <img src={croppedImage} alt="Recorte" class="max-w-[200px] rounded border shadow" />
      </div>
    {/if}
  </div>

  <input
    type="file"
    accept="image/*"
    on:change={handleFileChange}
    class="mb-6 rounded border px-4 py-2"
  />

  <div class="relative mt-8 flex items-center justify-center space-x-4">
    <button
      on:click={handleClick}
      class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
    >
      Scan Image
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
</main>

<style>
  /* Styles removed as they were unused in this component */
</style>
