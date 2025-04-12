<script>
	import { onMount } from 'svelte';

	let open = false;
	function handleClick() {
		alert('Imaged Scanned!');
	}

	onMount(async () => {
		const response = await fetch('../../backend/src/routes/icons');
		const icons = await response.json();
	});
</script>

<header
	class="bg-amber-600 p-4 text-white"
	style="background-image: url('/background.png'); background-size: cover; background-position: center;"
>
	<style>
		body {
			background-image: url('/background.png');
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
		}
	</style>
</header>
<header class="bg-amber-600 p-4 text-white">
	<div class="relative container mx-auto flex items-center justify-center">
		<h1 class="text-xl font-bold">Repetitive Archetypes Patterns Detector</h1>
		<!-- Menú desplegable -->
		<div class="absolute right-0">
			<button class="rounded bg-white px-4 py-2 text-black" on:click={() => (open = !open)}>
				Menú
			</button>
			{#if open}
				<div
					class="absolute right-0 z-10 mt-2 w-48 rounded bg-white text-black shadow-lg"
					on:click={(event) => {
						const option = event.target.dataset.option;
						if (option) alert(`Opción ${option} seleccionada`);
					}}
				>
					<a class="block px-4 py-2 hover:bg-gray-100" data-option="1">Opción 1</a>
					<a class="block px-4 py-2 hover:bg-gray-100" data-option="2">Opción 2</a>
				</div>
			{/if}
		</div>
	</div>
</header>

<div class="flex min-h-screen flex-col items-center justify-center">
	<img src="/image.png" alt="Reference" class="mb-4 h-auto w-300" />
	<button
		on:click={handleClick}
		class="rounded bg-blue-500 px-4 py-2 font-bold text-white hover:bg-blue-600"
	>
		Scan Image
	</button>
</div>
<header>
	<select>
		{#each icons as icon}
			<option value={icon}>{icon}</option>
		{/each}
	</select>
</header>
