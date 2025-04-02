
<script>
	let open = false;
</script>

<header class="bg-blue-600 text-white p-4">
	<div class="container mx-auto flex justify-center items-center relative">
		<h1 class="text-xl font-bold">Repetitive Archetypes Patterns Detector</h1>
		<!-- Menú desplegable -->
		<div class="absolute right-0">
			<button
				class="bg-white text-blue-600 px-4 py-2 rounded"
				on:click={() => (open = !open)}
			>
				Menú
			</button>

			{#if open}
				<div class="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg z-10">
					<a href="/opcion1" class="block px-4 py-2 hover:bg-gray-100">Opción 1</a>
					<a href="/opcion2" class="block px-4 py-2 hover:bg-gray-100">Opción 2</a>
					<a href="/opcion3" class="block px-4 py-2 hover:bg-gray-100">Opción 3</a>
				</div>
			{/if}
		</div>
	</div>
</header>
