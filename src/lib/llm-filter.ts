/**
 * Filter LLM raw output according to user preferences
 * This runs before sentence splitting and other processing
 */

/**
 * Apply filtering rules to LLM output:
 * 1. Remove all quotation marks (single and double quotes)
 * 2. Replace all dashes with commas
 * 3. Conditionally remove parentheses and their content
 * 
 * @param text - The raw LLM output text
 * @param allowActionDescription - If false, removes parentheses and their content
 * @returns Filtered text
 */
export function filterLLMOutput(text: string, allowActionDescription: boolean): string {
    let filtered = text;

    // 1. Remove all quotation marks (single and double quotes, including Chinese quotes)
    filtered = filtered.replace(/["'”“’‘《》]/g, '');

    // 2. Replace all types of dashes with commas
    // This includes: hyphen (-), en-dash (–), em-dash (—)
    filtered = filtered.replace(/[—–-]/g, ',');

    // 3. Remove parentheses and their content if action description is not allowed
    if (!allowActionDescription) {
        // Remove content in parentheses (both English and Chinese parentheses)
        filtered = filtered.replace(/\([^)]*\)/g, '');  // English parentheses
        filtered = filtered.replace(/（[^）]*）/g, '');  // Chinese parentheses
        filtered = filtered.replace(/\[[^\]]*\]/g, ''); // Square brackets (often used for actions)
    }

    return filtered;
}
