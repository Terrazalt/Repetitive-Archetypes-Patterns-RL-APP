<script lang="ts">
	import { onMount } from 'svelte';

	let open: boolean = false;
	let icons: string[] = [];
	let selectedImage: string | null = null;

	// Función que maneja la selección de imagen
	function handleClick(): void {
		if (selectedImage) {
			alert(`Selected image: ${selectedImage}`);
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
	</div>
</header>

<main class="flex flex-col items-center justify-center py-10 space-y-6">
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
		class="mb-6 px-4 py-2 rounded border"
	/>

	<!-- Botón de acción -->
	<button
		on:click={handleClick}
		class="mb-6 rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
	>
		Scan Image
	</button>

	<div class="relative">
		<button
			class="rounded bg-white px-4 py-2 text-black"
			on:click={() => (open = !open)}
		>
			Seleccionar Imagen
		</button>
		{#if open}
			<div
				class="absolute left-0 z-10 mt-2 w-48 rounded bg-white text-black shadow-lg dropdown-menu"
				role="menu"
				tabindex="0"
				style="top: 100%;"
			>
				{#each icons as icon}
					<button
						class="block px-4 py-2 hover:bg-gray-100"
						data-option={icon}
						on:click={() => (selectedImage = icon)}
						role="menuitem"
						tabindex="0"
					>
						<img
							src={icon}
							alt="icon option"
							class="image-option"
							width="100"
							height="100"
						/>
					</button>
				{/each}
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
