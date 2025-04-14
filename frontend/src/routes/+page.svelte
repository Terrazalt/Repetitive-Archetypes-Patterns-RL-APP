<script lang="ts">
	import { onMount } from 'svelte';

	let open: boolean = false;
	let openCNN: boolean = false;
	let icons: string[] = [];
	let selectedImage: string | null = null;
	let scan: boolean = false;
	// Función que maneja la selección de imagen
	function handleClick(): void {
		if (selectedImage) {
			alert(`Selected image: ${selectedImage}`);
			scan = true;
		} else {
			alert('No image selected');
		}
	}

	// Cargar imágenes de una API
	onMount(async () => {
		try {
			const res = await fetch('/api/icons');
			if (!res.ok) {
				throw new Error(`Error fetching icons: ${res.statusText}`);
			}
			const data: string[] = await res.json();
			icons = data;
		} catch (err) {
			console.error('Failed to load icons:', err);
		}
	});

	// Cambiar la imagen principal cuando se selecciona un archivo
	function handleFileChange(event: Event): void {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => {
				if (e.target) {
					selectedImage = e.target.result as string;
				}
			};
			reader.readAsDataURL(file);
		}
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
				<button class="py2 block px-4 hover:bg-amber-400" on:click={() => alert('CNN Model')}
					>Yolo Model</button
				>
				<button class="py2 block px-4 hover:bg-amber-400" on:click={() => (openCNN = false)}>
					Close
				</button>
			</div>
		{/if}
	</div>
</header>

<main class="flex flex-col items-center justify-center space-y-6 py-10">
	<!-- Imagen seleccionada o archivo -->
	{#if selectedImage}
		<img src={selectedImage} alt="Selected preview" class="mb-4 h-auto w-64 rounded shadow" />
	{:else}
		<img src="/image.png" alt="Reference" class="mb-4 h-auto w-64 rounded shadow" />
	{/if}

	<!-- Cargar imagen desde archivo -->
	<input
		type="file"
		accept="image/*"
		on:change={handleFileChange}
		class="mb-6 rounded border px-4 py-2"
	/>

	<!-- Botón de acción -->

	<!-- Contenedor centrado con botones en línea -->
	<div class="relative mt-8 flex items-center justify-center space-x-4">
		<!-- Botón principal -->
		<button
			on:click={handleClick}
			class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
		>
			Scan Image
		</button>
		{#if scan}
			<!-- Contenedor relativo para el botón y dropdown -->
			<div class="relative">
				<!-- Botón de selección -->
				<button
					class="rounded border bg-white px-4 py-2 text-black hover:bg-gray-100"
					on:click={() => (open = !open)}
				>
					Seleccionar Imagen
				</button>

				<!-- Menú desplegable debajo del botón "Seleccionar Imagen" -->
				{#if open}
					<div class="absolute right-0 z-20 mt-2 w-52 rounded border bg-white text-black shadow-lg">
						{#each icons as icon}
							<button
								class="flex w-full justify-center px-4 py-2 hover:bg-gray-100"
								on:click={() => {
									selectedImage = icon;
									open = false;
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
	body {
		background-image: url('/background.png');
		background-size: cover;
		background-position: center;
		background-repeat: no-repeat;
	}

	.image-option {
		cursor: pointer;
		border: 2px solid transparent;
		transition: border 0.2s;
		border-radius: 8px;
	}

	.image-option:hover {
		border-color: gray;
	}

	.image-option.selected {
		border-color: blue;
	}

	.dropdown-menu {
		max-height: 200px;
		overflow-y: auto;
	}
</style>
