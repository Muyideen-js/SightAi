import { useState, useCallback } from 'react';

// How many frames to keep in history
const MAX_HISTORY = 12;

export function useVisionMemory() {
    // Array of { timestamp, objects, food_items, tools, scene_description, frameSummary }
    const [visionMemory, setVisionMemory] = useState([]);

    // Dictionary tracking known entities { "tomato": { firstSeen, lastSeen, confidence, count } }
    const [objectMemory, setObjectMemory] = useState({});

    // Scene classification string (e.g., "kitchen")
    const [currentScene, setCurrentScene] = useState('');

    const addFrameData = useCallback((jsonData, frameSummaryText) => {
        const now = Date.now();

        // 1. Update the linear timeline memory
        setVisionMemory(prev => {
            const newEntry = {
                timestamp: now,
                ...jsonData,
                frameSummary: frameSummaryText
            };
            const updated = [...prev, newEntry];
            if (updated.length > MAX_HISTORY) {
                return updated.slice(updated.length - MAX_HISTORY);
            }
            return updated;
        });

        // 2. Update the deduplicated spatial object memory
        setObjectMemory(prev => {
            const nextMem = { ...prev };

            const extractItems = (list) => {
                if (!Array.isArray(list)) return;
                list.forEach(itemStr => {
                    const name = itemStr.toLowerCase().trim();
                    if (nextMem[name]) {
                        nextMem[name].lastSeen = now;
                        nextMem[name].count += 1;
                    } else {
                        nextMem[name] = {
                            firstSeen: now,
                            lastSeen: now,
                            count: 1
                        };
                    }
                });
            };

            extractItems(jsonData.objects);
            extractItems(jsonData.food_items);
            extractItems(jsonData.tools);
            extractItems(jsonData.important_items);

            return nextMem;
        });

        // 3. Update active scene context
        if (jsonData.scene_description) {
            setCurrentScene(jsonData.scene_description);
        }
    }, []);

    const clearMemory = useCallback(() => {
        setVisionMemory([]);
        setObjectMemory({});
        setCurrentScene('');
    }, []);

    // Helper for gemini prompt injection
    const getMemoryContextString = useCallback(() => {
        if (visionMemory.length === 0) return "No previous visual context.";

        let str = "Recent observations from camera:\n\n";

        // Summarize last ~3 distinct scenes/frames to avoid payload bloat
        const recent = visionMemory.slice(-3);
        recent.forEach((frame, idx) => {
            str += `Frame -${recent.length - idx} (Scene: ${frame.scene_description || 'unknown'}):\n`;
            str += `- Objects/Food present: ${[...(frame.objects || []), ...(frame.food_items || [])].join(', ')}\n`;
        });

        const allKnownObjects = Object.keys(objectMemory);
        if (allKnownObjects.length > 0) {
            str += `\nAll known tracked objects in environment: ${allKnownObjects.join(', ')}\n`;
        }
        return str;
    }, [visionMemory, objectMemory]);

    return {
        visionMemory,
        objectMemory,
        currentScene,
        addFrameData,
        clearMemory,
        getMemoryContextString
    };
}
