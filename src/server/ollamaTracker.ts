/**
 * Ollama Tracker
 * Tracks running Ollama models and their active conversations/tasks
 */

interface OllamaModel {
    name: string;
    model: string;
    size: number;
    digest: string;
    details: {
        parent_model: string;
        format: string;
        family: string;
        families: string[];
        parameter_size: string;
        quantization_level: string;
    };
    expires_at: string;
    size_vram: number;
}

interface OllamaTask {
    taskId: string;
    subject: string;
    description: string;
    status: 'active' | 'idle';
    model: string;
    startTime?: string;
}

interface OllamaSession {
    sessionId: string;
    model: string;
    currentTask?: string;
    tasks: OllamaTask[];
    size: number;
    sizeVram: number;
}

class OllamaTracker {
    private readonly baseUrl = 'http://localhost:11434';

    /**
     * Get all running Ollama models
     */
    async getRunningModels(): Promise<OllamaModel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/ps`);
            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching Ollama models:', error);
            return [];
        }
    }

    /**
     * Get active sessions with task information
     */
    async getActiveSessionsWithTasks(): Promise<OllamaSession[]> {
        const models = await this.getRunningModels();

        return models.map(model => {
            const sessionId = `ollama-${model.name}-${Date.now()}`;

            // Create a synthetic task based on model being loaded
            const task: OllamaTask = {
                taskId: `task-${model.name}`,
                subject: `Model ${model.model} loaded in memory`,
                description: `Running ${model.details.family} model (${model.details.parameter_size} parameters, ${model.details.quantization_level} quantization)`,
                status: 'active',
                model: model.model,
                startTime: model.expires_at,
            };

            const session: OllamaSession = {
                sessionId,
                model: model.model,
                currentTask: `Model loaded and ready for inference`,
                tasks: [task],
                size: model.size,
                sizeVram: model.size_vram,
            };

            return session;
        });
    }

    /**
     * Get session details for a specific model
     */
    async getSessionDetails(modelName: string): Promise<OllamaSession | null> {
        const sessions = await this.getActiveSessionsWithTasks();
        return sessions.find(s => s.model.includes(modelName)) || null;
    }

    /**
     * Check if Ollama is running
     */
    async isOllamaRunning(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000),
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    /**
     * Get list of available models (not necessarily running)
     */
    async getAvailableModels(): Promise<{ name: string; size: number; modified_at: string }[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.models || [];
        } catch (error) {
            console.error('Error fetching available Ollama models:', error);
            return [];
        }
    }
}

export const ollamaTracker = new OllamaTracker();
