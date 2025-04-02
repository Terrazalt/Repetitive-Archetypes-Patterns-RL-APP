
<script>
	let open = false;
	   function handleClick() {
	   alert("Imaged Scanned!");
	 }
</script>
<header class="bg-amber-600 text-white p-4" style="background-image: url('/background.png'); background-size: cover; background-position: center;">
<style>
  body {
    background-image: url('/background.png');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
  }
</style>
</header>  
<header class="bg-amber-600 text-white p-4">
	<div class="container mx-auto flex justify-center items-center relative">
		<h1 class="text-xl font-bold">Repetitive Archetypes Patterns Detector</h1>
		<!-- Menú desplegable -->
		<div class="absolute right-0">
			<button
				class="bg-white text-black px-4 py-2 rounded"
				on:click={() => (open = !open)}
			>
				Menú
			</button>
			{#if open}
				<div class="absolute right-0 mt-2 w-48 bg-white text-black rounded shadow-lg z-10" 
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

<div class="flex flex-col items-center justify-center min-h-screen">
  <img src="/image.png" alt="Reference" class="w-300 h-auto mb-4" />
  <button
    on:click={handleClick}
    class="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
  >
    Scan Image
  </button>
</div>
