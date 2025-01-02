import * as vscode from 'vscode';

let lastChangeTime: number = Date.now();
let aiScore: number = 0;
const AI_THRESHOLD = 5; 
const MANUAL_THRESHOLD = -3;

export function activate(context: vscode.ExtensionContext) {
    console.log('Extension "hulk" is now active.');

    // Listener para detectar cambios en el documento
    const documentChangeListener = vscode.workspace.onDidChangeTextDocument((event) => {
        handleInput(event);
    });

    // Listener para guardar el documento
    const documentSaveListener = vscode.workspace.onDidSaveTextDocument((document) => {
        appendMetadata(document);
    });

    context.subscriptions.push(documentChangeListener, documentSaveListener);
}

function handleInput(event: vscode.TextDocumentChangeEvent) {
    const changes = event.contentChanges;

    if (changes.length > 0) {
        updateAIScore(changes);
    }
}

// Actualiza el puntaje en base a las características del input
function updateAIScore(changes: readonly vscode.TextDocumentContentChangeEvent[]): void {
    const currentTime = Date.now();
    const timeSinceLastChange = currentTime - lastChangeTime;
    lastChangeTime = currentTime;

    changes.forEach(change => {
        if (change.text.length > 100) {
            aiScore += 2;
        } else if (change.text.length < 20) {
            aiScore -= 1;
        }

        if (timeSinceLastChange < 50) {
            aiScore += 1;
        } else if (timeSinceLastChange > 300) {
            aiScore -= 1;
        }

        const words = change.text.split(/\s+/);
        if (words.length > 10 && new Set(words).size / words.length < 0.7) {
            aiScore += 2;
        }
    });

    console.log(`Updated AI Score: ${aiScore}`);
}

// Agrega metadata al final del archivo al guardarlo
function appendMetadata(document: vscode.TextDocument): void {
    const editor = vscode.window.activeTextEditor;
    if (editor && editor.document === document) {
        const timestamp = new Date().toISOString(); // Timestamp actual
        const config = vscode.workspace.getConfiguration("hulk");
        const author = config.get<string>("author", "Unknown Author"); // Obtener autor desde configuración

        const metadata = `\n\n/* Metadata:\n   Detected input type: ${determineInputType()} \n   AI Score: ${aiScore}\n   Timestamp: ${timestamp}\n   Author: ${author}\n*/`;

        editor.edit(editBuilder => {
            const lastLine = document.lineCount;
            const position = new vscode.Position(lastLine, 0);
            editBuilder.insert(position, metadata);
        }).then(() => {
            vscode.window.showInformationMessage('Metadata appended to file.');
            resetAIScore(); // Reseteamos el puntaje después de guardar
        });
    }
}

// Determina el tipo de input basado en el puntaje
function determineInputType(): string {
    if (aiScore >= AI_THRESHOLD) {
        return "AI";
    } else if (aiScore <= MANUAL_THRESHOLD) {
        return "Manual";
    }
    return "Undetermined";
}

// Resetea el puntaje acumulado
function resetAIScore(): void {
    aiScore = 0;
}

// Método de desactivación
export function deactivate() {}
