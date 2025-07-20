<script lang="ts">
	import '../App.css';
	import { page } from '$app/stores';

	const { children } = $props();
</script>

<div class="min-h-screen bg-gray-50">
	<header class="bg-red-300 shadow-sm border-b">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex justify-between items-center h-16 ">
				<h1 class="text-xl font-semibold text-gray-700">
					Repetitive Archetypes Patterns RL
				</h1>
				<!-- Navegación con pestañas -->
				<nav class="flex space-x-8">
					<a 
						href="/" 
						class="px-3 py-2 text-sm font-medium rounded-md transition-colors
							{$page.url.pathname === '/' 
								? 'bg-blue-100 text-blue-700' 
								: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}"
					>
						Detección
					</a>
					<a 
						href="/reentrenamiento" 
						class="px-3 py-2 text-sm font-medium rounded-md transition-colors
							{$page.url.pathname === '/reentrenamiento' 
								? 'bg-blue-100 text-blue-700' 
								: 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}"
					>
						Reentrenamiento
					</a>
				</nav>
			</div>
		</div>
	</header>
	<main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		{@render children()}
	</main>
</div>
