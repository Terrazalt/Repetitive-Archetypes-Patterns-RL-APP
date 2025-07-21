<script lang="ts">
	import { onMount } from 'svelte';

	// Estados para el proceso de reentrenamiento
	let isTraining = $state(false);
	let trainingProgress = $state(0);
	let trainingLogs = $state<string[]>([]);
	let selectedDataset = $state<string | null>(null);
	let availableDatasets = $state<string[]>([]);



	// ===== VARIABLES RLHF =====
	let rlhfStep = $state<'idle' | 'training' | 'feedback' | 'completing' | 'completed'>('idle');
	let predictionsForFeedback = $state<{
		image_name: string;
		image_base64: string;
		total_detections: number;
		predictions: {
			class_name: string;
			confidence: number;
		}[];
	}[]>([]);
	let currentEpoch = $state(0);
	let feedbackQuality = $state(0.5);
	let feedbackComments = $state('');
	let rlhfConfig = $state<{
		enable: boolean;
		epoch_trigger: number;
		reward_factor: number;
		feedback_quality?: number;
	} | null>(null);
	let finalModelPath = $state('');

	// Endpoints del backend  
	const RLHF_BASE_URL = import.meta.env.VITE_RLHF_BASE_URL || 'http://localhost:8000/rlhf';
	const RLHF_START_TRAINING = `${RLHF_BASE_URL}/start-training`;
	const RLHF_SUBMIT_FEEDBACK = `${RLHF_BASE_URL}/submit-feedback`;
	const RLHF_COMPLETE_TRAINING = `${RLHF_BASE_URL}/complete-training`;

	onMount(async () => {
		await loadAvailableDatasets();
	});

	async function loadAvailableDatasets() {
		try {
			// Dataset real disponible en el proyecto
			availableDatasets = [
				'/home/terrazalt/Documents/magister/Repetitive-Archetypes-Patterns-RL-APP/CNN/Repetitive-Patterns-MTI-2/data.yaml'
			];
			// Seleccionar automáticamente el único dataset disponible
			selectedDataset = availableDatasets[0];
		} catch (error) {
			console.error('Error loading datasets:', error);
		}
	}	async function startRetraining() {
		if (!selectedDataset) {
			alert('Por favor selecciona un dataset');
			return;
		}

		// Resetear estado
		rlhfStep = 'training';
		isTraining = true;
		trainingProgress = 0;
		trainingLogs = ['🚀 Iniciando entrenamiento RLHF...'];
		predictionsForFeedback = [];
		
		try {
			// PASO 1: Iniciar entrenamiento RLHF
			trainingLogs = [...trainingLogs, '📡 Conectando con servidor RLHF...'];
			
			const response = await fetch(RLHF_START_TRAINING, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					initial_epochs: 3,
					data_yaml: selectedDataset,
					num_images: 4
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Error ${response.status}: ${errorData.detail || response.statusText}`);
			}

			const result = await response.json();
			
			// Actualizar estado con resultados
			predictionsForFeedback = result.predictions_for_feedback;
			currentEpoch = result.current_epoch;
			trainingProgress = 50; // 50% completado (entrenamiento inicial)
			
			trainingLogs = [
				...trainingLogs, 
				`✅ ${result.message}`,
				`📷 Predicciones generadas para ${result.predictions_for_feedback.length} imágenes`,
				`🎯 Siguiente paso: ${result.next_step}`,
				'⏳ Esperando feedback humano...'
			];
			
			// Cambiar a estado de feedback
			rlhfStep = 'feedback';
			isTraining = false;

		} catch (error) {
			isTraining = false;
			rlhfStep = 'idle';
			const errorMessage = error instanceof Error ? error.message : String(error);
			trainingLogs = [...trainingLogs, `❌ Error: ${errorMessage}`];
			console.error('Error en entrenamiento RLHF:', error);
			
			// Mostrar alert con el error
			alert(`Error al iniciar entrenamiento RLHF: ${errorMessage}`);
		}
	}

	// ===== FUNCIÓN PARA ENVIAR FEEDBACK =====
	async function submitFeedback() {
		if (feedbackQuality < 0 || feedbackQuality > 1) {
			alert('La calidad debe estar entre 0.0 y 1.0');
			return;
		}

		rlhfStep = 'completing';
		isTraining = true;
		trainingLogs = [...trainingLogs, '🔄 Procesando feedback humano...'];

		try {
			// PASO 2: Enviar feedback
			const response = await fetch(RLHF_SUBMIT_FEEDBACK, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					overall_quality: feedbackQuality,
					comments: feedbackComments || 'Sin comentarios'
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Error ${response.status}: ${errorData.detail || response.statusText}`);
			}

			const result = await response.json();
			rlhfConfig = result.rlhf_config;
			
			trainingLogs = [
				...trainingLogs,
				`✅ ${result.message}`,
				`🎯 Configuración RLHF generada exitosamente`,
				'🚀 Continuando entrenamiento con feedback...'
			];

			// PASO 3: Completar entrenamiento
			await completeTraining();

		} catch (error) {
			isTraining = false;
			rlhfStep = 'feedback';
			const errorMessage = error instanceof Error ? error.message : String(error);
			trainingLogs = [...trainingLogs, `❌ Error procesando feedback: ${errorMessage}`];
			console.error('Error en feedback:', error);
			
			// Mostrar alert con el error
			alert(`Error al procesar feedback: ${errorMessage}`);
		}
	}

	// ===== FUNCIÓN PARA COMPLETAR ENTRENAMIENTO =====
	async function completeTraining() {
		try {
			const response = await fetch(RLHF_COMPLETE_TRAINING, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					additional_epochs: 5,
					data_yaml: selectedDataset
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(`Error ${response.status}: ${errorData.detail || response.statusText}`);
			}

			const result = await response.json();
			
			// Entrenamiento completado
			finalModelPath = result.final_model_path;
			currentEpoch = result.current_epoch;
			trainingProgress = 100;
			isTraining = false;
			rlhfStep = 'completed';
			
			trainingLogs = [
				...trainingLogs,
				`✅ ${result.message}`,
				`📈 Total de épocas entrenadas: ${result.current_epoch}`,
				`💾 Modelo final guardado en: ${result.final_model_path}`,
				'🎉 ¡Proceso RLHF completado exitosamente!'
			];

		} catch (error) {
			isTraining = false;
			rlhfStep = 'feedback';
			const errorMessage = error instanceof Error ? error.message : String(error);
			trainingLogs = [...trainingLogs, `❌ Error completando entrenamiento: ${errorMessage}`];
			console.error('Error completando entrenamiento:', error);
			
			// Mostrar alert con el error
			alert(`Error al completar entrenamiento: ${errorMessage}`);
		}
	}

	// ===== FUNCIÓN PARA PROBAR CONEXIÓN =====
	async function testConnection() {
		try {
			const response = await fetch(`${RLHF_BASE_URL}/status`, {
				method: 'GET',
				headers: { 'Content-Type': 'application/json' }
			});

			if (!response.ok) {
				throw new Error(`Error ${response.status}: ${response.statusText}`);
			}

			const result = await response.json();
			alert(`✅ Conexión exitosa!\n\nEstado: ${result.status}\nMensaje: ${result.message}`);
			
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			alert(`❌ Error de conexión: ${errorMessage}\n\nVerifica que el servidor RLHF esté ejecutándose en ${RLHF_BASE_URL}`);
		}
	}


</script>

<!-- Background gradient -->
<div class="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
	<div class="max-w-6xl mx-auto px-4 py-8 space-y-8">
		<!-- Hero Section -->
		<div class="text-center bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
			<div class="flex items-center justify-center mb-4">
				<div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-full mr-4">
					🧠
				</div>
				<div class="text-left">
					<h1 class="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						RLHF Training System
					</h1>
					<p class="text-sm text-gray-500 font-medium tracking-wide">HUMAN-IN-THE-LOOP</p>
				</div>
			</div>
			
			<p class="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
				Sistema avanzado de entrenamiento con retroalimentación humana para optimizar 
				las predicciones del modelo YOLO mediante aprendizaje interactivo
			</p>
			
			{#if rlhfStep !== 'idle'}
				<div class="mt-6 inline-flex items-center px-6 py-3 rounded-full text-sm font-semibold shadow-lg
							{rlhfStep === 'training' ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
							 rlhfStep === 'feedback' ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white' :
							 rlhfStep === 'completing' ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white' :
							 rlhfStep === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}">
					{#if rlhfStep === 'training'}
						<div class="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
						Entrenamiento en progreso
					{:else if rlhfStep === 'feedback'}
						🎯 Esperando evaluación humana
					{:else if rlhfStep === 'completing'}
						<div class="animate-pulse w-4 h-4 bg-white rounded-full mr-2"></div>
						Aplicando feedback
					{:else if rlhfStep === 'completed'}
						✨ Entrenamiento completado
					{/if}
				</div>
			{/if}
		</div>

		<!-- Dataset Selection Section -->
		<div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
			<div class="flex items-center mb-6">
				<div class="bg-gradient-to-r from-emerald-500 to-teal-500 text-white p-3 rounded-xl mr-4">
					�
				</div>
				<h2 class="text-2xl font-bold text-gray-800">
					Configuración del Dataset
				</h2>
			</div>
			
			<!-- Dataset Selection -->
			<div class="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
				<label for="dataset-select" class="block text-sm font-semibold text-gray-700 mb-3">
					🗃️ Seleccionar dataset existente para reentrenamiento RLHF
				</label>
				<select
					id="dataset-select"
					bind:value={selectedDataset}
					class="block w-full px-4 py-3 border-2 border-blue-200 rounded-xl
						   focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
						   bg-white text-gray-700 font-medium shadow-sm
						   transition-all duration-200"
				>
					<option value={null}>✨ Selecciona un dataset...</option>
					{#each availableDatasets as dataset}
						<option value={dataset}>📊 {dataset.split('/').pop()}</option>
					{/each}
				</select>
				<p class="text-sm text-blue-600 mt-2 font-medium">
					💡 El reentrenamiento utilizará las imágenes existentes del dataset del proyecto
				</p>
				
				{#if selectedDataset}
					<div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
						<p class="text-sm text-green-700 font-medium">
							✅ Dataset seleccionado: <code class="bg-white px-1 rounded">{selectedDataset.split('/').pop()}</code>
						</p>
						<p class="text-xs text-green-600 mt-1">
							Ruta completa: {selectedDataset}
						</p>
					</div>
				{/if}
				
				<!-- Test Connection Button -->
				<div class="mt-4 pt-4 border-t border-blue-200">
					<button
						onclick={testConnection}
						class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg 
							   hover:bg-blue-700 transition-colors"
					>
						🔗 Probar Conexión RLHF
					</button>
				</div>
			</div>
		</div>

		<!-- Training Control Section -->
		<div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
			<div class="flex items-center mb-6">
				<div class="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-3 rounded-xl mr-4">
					🤖
				</div>
				<h2 class="text-2xl font-bold text-gray-800">
					Control de Entrenamiento
				</h2>
			</div>
			
			<div class="space-y-6">
				<!-- Training Button -->
				<button
					onclick={startRetraining}
					disabled={isTraining || !selectedDataset || rlhfStep !== 'idle'}
					class="w-full px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white 
						   font-bold rounded-xl text-lg shadow-xl
						   hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed 
						   transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100
						   border border-white/20"
				>
					<div class="flex items-center justify-center">
						{#if rlhfStep === 'idle'}
							{#if isTraining}
								<div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
								Iniciando entrenamiento...
							{:else}
								🚀 Iniciar Entrenamiento RLHF
							{/if}
						{:else if rlhfStep === 'training'}
							<div class="animate-pulse w-5 h-5 bg-white rounded-full mr-3"></div>
							🧠 Entrenando modelo inicial...
						{:else if rlhfStep === 'feedback'}
							⏳ Esperando feedback humano
						{:else if rlhfStep === 'completing'}
							<div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
							🔄 Aplicando feedback...
						{:else if rlhfStep === 'completed'}
							✨ Entrenamiento completado
						{/if}
					</div>
				</button>

				<!-- Enhanced Progress Section -->
				{#if rlhfStep !== 'idle'}
					<div class="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-100">
						<!-- Current Status -->
						<div class="flex justify-between items-center mb-4">
							<div class="flex items-center">
								<div class="w-3 h-3 rounded-full mr-3 {
									rlhfStep === 'training' ? 'bg-blue-500 animate-pulse' :
									rlhfStep === 'feedback' ? 'bg-amber-500 animate-pulse' :
									rlhfStep === 'completing' ? 'bg-purple-500 animate-pulse' :
									rlhfStep === 'completed' ? 'bg-green-500' : 'bg-gray-400'
								}"></div>
								<span class="font-bold text-gray-700">
									{#if rlhfStep === 'training'}
										🚀 Entrenamiento inicial
									{:else if rlhfStep === 'feedback'}
										🎯 Evaluación humana
									{:else if rlhfStep === 'completing'}
										🔄 Entrenamiento con feedback
									{:else if rlhfStep === 'completed'}
										✅ Completado
									{/if}
								</span>
							</div>
							<span class="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
								{trainingProgress.toFixed(1)}%
							</span>
						</div>

						<!-- Progress Bar -->
						<div class="bg-gray-200 rounded-full h-4 shadow-inner overflow-hidden mb-4">
							<div 
								class="h-4 rounded-full transition-all duration-700 shadow-sm {
									rlhfStep === 'training' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
									rlhfStep === 'feedback' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
									rlhfStep === 'completing' ? 'bg-gradient-to-r from-purple-500 to-indigo-600' :
									rlhfStep === 'completed' ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-400'
								}"
								style="width: {trainingProgress}%"
							></div>
						</div>

						<!-- Stage Indicators -->
						<div class="grid grid-cols-4 gap-2 text-xs">
							<div class="text-center p-2 rounded-lg {rlhfStep === 'training' || trainingProgress > 0 ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'}">
								🚀 Inicial
							</div>
							<div class="text-center p-2 rounded-lg {rlhfStep === 'feedback' ? 'bg-amber-100 text-amber-700 font-bold' : 'text-gray-500'}">
								🎯 Feedback
							</div>
							<div class="text-center p-2 rounded-lg {rlhfStep === 'completing' ? 'bg-purple-100 text-purple-700 font-bold' : 'text-gray-500'}">
								🔄 Final
							</div>
							<div class="text-center p-2 rounded-lg {rlhfStep === 'completed' ? 'bg-green-100 text-green-700 font-bold' : 'text-gray-500'}">
								✅ Listo
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>

		<!-- ===== RLHF FEEDBACK SECTION ===== -->
		{#if rlhfStep === 'feedback' && predictionsForFeedback.length > 0}
			<div class="bg-gradient-to-br from-white to-blue-50/50 backdrop-blur-sm rounded-2xl shadow-xl p-8 border-2 border-blue-200/50">
				<div class="flex items-center mb-6">
					<div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-3 rounded-xl mr-4">
						🎯
					</div>
					<div>
						<h2 class="text-2xl font-bold text-gray-800">
							Evaluación Humana
						</h2>
						<p class="text-sm text-blue-600 font-medium">Human-in-the-Loop Feedback</p>
					</div>
				</div>
				
				<div class="bg-blue-50/50 rounded-xl p-6 mb-8 border border-blue-100">
					<div class="flex items-center mb-4">
						<div class="bg-blue-500 text-white p-2 rounded-lg mr-3">📊</div>
						<div>
							<p class="text-gray-700 font-medium">
								Entrenamiento inicial completado con <span class="font-bold text-blue-600">{currentEpoch} épocas</span>
							</p>
							<p class="text-sm text-gray-600">
								Evalúa la calidad de estas predicciones para mejorar el modelo
							</p>
						</div>
					</div>
				</div>

				<!-- Prediction Images Grid -->
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
					{#each predictionsForFeedback as prediction, index}
						<div class="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 hover:shadow-xl transition-shadow duration-300">
							<div class="bg-gradient-to-r from-gray-800 to-gray-700 text-white p-4">
								<h3 class="font-bold flex items-center">
									<span class="bg-white/20 rounded-full w-6 h-6 flex items-center justify-center text-xs mr-2">
										{index + 1}
									</span>
									📷 {prediction.image_name}
								</h3>
							</div>
							
							<div class="p-4">
								<!-- Image Display -->
								<div class="relative mb-4 group">
									<img 
										src="data:image/png;base64,{prediction.image_base64}" 
										alt="Predicción {index + 1}"
										class="w-full h-56 object-contain bg-gray-50 rounded-lg border-2 border-gray-100
											   group-hover:border-blue-300 transition-colors duration-200"
									/>
									<div class="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-lg text-xs font-medium">
										{prediction.total_detections} detecciones
									</div>
								</div>
								
								<!-- Prediction Details -->
								<div class="space-y-2">
									{#if prediction.predictions.length > 0}
										{#each prediction.predictions as pred}
											<div class="flex justify-between items-center bg-gray-50 rounded-lg p-3">
												<span class="font-medium text-gray-700">{pred.class_name}</span>
												<div class="flex items-center">
													<div class="w-16 bg-gray-200 rounded-full h-2 mr-2">
														<div 
															class="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full" 
															style="width: {pred.confidence * 100}%"
														></div>
													</div>
													<span class="font-bold text-sm text-gray-800">
														{(pred.confidence * 100).toFixed(1)}%
													</span>
												</div>
											</div>
										{/each}
									{:else}
										<div class="text-center text-gray-500 py-4">
											<div class="text-4xl mb-2">🔍</div>
											<p>No se detectaron objetos</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>

				<!-- Feedback Controls -->
				<div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
					<div class="flex items-center mb-6">
						<div class="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-2 rounded-lg mr-3">
							📊
						</div>
						<h3 class="font-bold text-gray-800 text-lg">
							Evalúa la calidad general de las predicciones
						</h3>
					</div>
					
					<!-- Quality Slider -->
					<div class="mb-6">
						<label for="quality-slider" class="block text-sm font-bold text-gray-700 mb-3">
							Calidad general: 
							<span class="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
								{feedbackQuality.toFixed(2)}
							</span>
						</label>
						<div class="relative">
							<input
								id="quality-slider"
								type="range"
								min="0"
								max="1"
								step="0.01"
								bind:value={feedbackQuality}
								class="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer 
									   slider-thumb:appearance-none slider-thumb:w-6 slider-thumb:h-6 
									   slider-thumb:bg-gradient-to-r slider-thumb:from-blue-500 slider-thumb:to-indigo-600 
									   slider-thumb:rounded-full slider-thumb:shadow-lg"
							/>
							<div class="flex justify-between text-xs text-gray-600 mt-2 font-medium">
								<span class="bg-red-100 text-red-600 px-2 py-1 rounded">0.0 Muy malo</span>
								<span class="bg-yellow-100 text-yellow-600 px-2 py-1 rounded">0.5 Regular</span>
								<span class="bg-green-100 text-green-600 px-2 py-1 rounded">1.0 Excelente</span>
							</div>
						</div>
					</div>

					<!-- Comments -->
					<div class="mb-6">
						<label for="feedback-comments" class="block text-sm font-bold text-gray-700 mb-2">
							💬 Comentarios adicionales (opcional)
						</label>
						<textarea
							id="feedback-comments"
							bind:value={feedbackComments}
							placeholder="Describe qué observaste en las predicciones: precisión, objetos perdidos, detecciones incorrectas..."
							class="w-full px-4 py-3 border-2 border-blue-200 rounded-xl 
								   focus:outline-none focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500
								   bg-white resize-none transition-all duration-200"
							rows="3"
						></textarea>
					</div>

					<!-- Feedback Interpretation -->
					<div class="bg-white rounded-xl p-4 border border-blue-100 mb-6">
						<div class="flex items-center mb-2">
							<span class="text-lg mr-2">💡</span>
							<p class="font-bold text-gray-800">Interpretación del feedback:</p>
						</div>
						<div class="text-sm {
							feedbackQuality >= 0.7 ? 'text-green-700 bg-green-50' :
							feedbackQuality <= 0.3 ? 'text-red-700 bg-red-50' :
							'text-amber-700 bg-amber-50'
						} p-3 rounded-lg font-medium">
							{#if feedbackQuality >= 0.7}
								✅ Predicciones excelentes → El modelo recibirá una recompensa (reduce loss para mejorar)
							{:else if feedbackQuality <= 0.3}
								❌ Predicciones deficientes → El modelo recibirá una penalización (aumenta loss para corregir)
							{:else}
								⚡ Predicciones regulares → Ajuste moderado al entrenamiento del modelo
							{/if}
						</div>
					</div>

					<!-- Submit Button -->
					<button
						onclick={submitFeedback}
						disabled={isTraining}
						class="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
							   font-bold rounded-xl text-lg shadow-xl
							   hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed 
							   transition-all duration-300 transform hover:scale-[1.02] disabled:hover:scale-100"
					>
						{#if isTraining}
							<div class="flex items-center justify-center">
								<div class="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
								Procesando feedback...
							</div>
						{:else}
							🚀 Enviar Feedback y Continuar Entrenamiento
						{/if}
					</button>
				</div>
			</div>
		{/if}

		<!-- ===== COMPLETION SECTION ===== -->
		{#if rlhfStep === 'completed'}
			<div class="bg-gradient-to-br from-white to-green-50/50 backdrop-blur-sm rounded-2xl shadow-xl p-8 border-2 border-green-200/50">
				<div class="flex items-center mb-6">
					<div class="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-3 rounded-xl mr-4">
						🎉
					</div>
					<div>
						<h2 class="text-2xl font-bold text-gray-800">
							Entrenamiento RLHF Completado
						</h2>
						<p class="text-sm text-green-600 font-medium">¡Éxito total!</p>
					</div>
				</div>
				
				<!-- Stats Grid -->
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
					<div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-center border border-green-100">
						<div class="text-4xl font-black text-green-600 mb-2">{currentEpoch}</div>
						<div class="text-sm text-gray-600 font-medium">Épocas Totales</div>
						<div class="text-xs text-green-600 mt-1">📈 Entrenamiento completo</div>
					</div>
					<div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 text-center border border-blue-100">
						<div class="text-4xl font-black text-blue-600 mb-2">{feedbackQuality.toFixed(2)}</div>
						<div class="text-sm text-gray-600 font-medium">Calidad Evaluada</div>
						<div class="text-xs text-blue-600 mt-1">🎯 Feedback humano</div>
					</div>
					<div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 text-center border border-purple-100">
						<div class="text-4xl font-black text-purple-600 mb-2">
							{rlhfConfig?.reward_factor ? rlhfConfig.reward_factor.toFixed(3) : 'N/A'}
						</div>
						<div class="text-sm text-gray-600 font-medium">Reward Factor</div>
						<div class="text-xs text-purple-600 mt-1">🧠 Factor de aprendizaje</div>
					</div>
				</div>

				<!-- Model Path Display -->
				<div class="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 mb-6">
					<div class="flex items-center mb-3">
						<div class="bg-gray-600 text-white p-2 rounded-lg mr-3">💾</div>
						<p class="font-bold text-gray-800">Modelo final guardado en:</p>
					</div>
					<div class="bg-white rounded-lg p-4 border-2 border-gray-100">
						<code class="text-sm text-gray-700 font-mono break-all">
							{finalModelPath || 'Generando ruta del modelo...'}
						</code>
					</div>
				</div>

				<!-- Action Buttons -->
				<div class="flex flex-col sm:flex-row gap-4">
					<button
						onclick={() => {
							rlhfStep = 'idle';
							predictionsForFeedback = [];
							trainingProgress = 0;
							feedbackQuality = 0.5;
							feedbackComments = '';
						}}
						class="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-slate-600 text-white 
							   font-bold rounded-xl hover:from-gray-700 hover:to-slate-700 
							   transition-all duration-300 transform hover:scale-[1.02]"
					>
						🔄 Nuevo Entrenamiento
					</button>
					<button
						class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white 
							   font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 
							   transition-all duration-300 transform hover:scale-[1.02]"
					>
						📊 Ver Métricas Detalladas
					</button>
				</div>
			</div>
		{/if}

		<!-- Training Logs -->
		{#if trainingLogs.length > 0}
			<div class="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white/50">
				<div class="flex items-center mb-6">
					<div class="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-3 rounded-xl mr-4">
						📋
					</div>
					<h2 class="text-2xl font-bold text-gray-800">
						Logs del Entrenamiento
					</h2>
				</div>
				
				<div class="bg-gradient-to-br from-gray-900 to-black rounded-xl p-6 max-h-80 overflow-y-auto border-2 border-gray-700">
					<div class="space-y-2">
						{#each trainingLogs as log, index}
							<div class="flex items-start text-sm font-mono">
								<span class="text-green-400 mr-3 font-bold">
									[{new Date().toLocaleTimeString()}]
								</span>
								<span class="text-gray-300 leading-relaxed">
									{log}
								</span>
							</div>
						{/each}
					</div>
					
					<!-- Auto-scroll indicator -->
					<div class="flex justify-center mt-4">
						<div class="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs">
							📡 Logs en tiempo real
						</div>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
