export class StringHelper {
    public static formatParagraph(text: string, maxLineLength: number = 40): string {
        const nobreakBefore = [';', ':', '?', '!', ')', '»'];
        const nobreakAfter = ['(', '«'];

        text = text.replace(/ ?([;:?!»])/g, '\u00A0$1');
        text = text.replace(/([«(]) ?/g, '$1\u00A0');

        const words = text.split(/\s+/);
        let lines: string[] = [];
        let currentLine = "";

        for (const word of words) {
            const potentialLine = currentLine.length > 0 ? currentLine + ' ' + word : word;
            const lastWord = currentLine.split(' ').pop() || '';
            if ((nobreakBefore.includes(word[0]) && currentLine.length > 0) ||
                (nobreakAfter.includes(lastWord) && currentLine.length > 0)) {
                currentLine += '\u00A0' + word;
            } else if (potentialLine.length <= maxLineLength) {
                currentLine = potentialLine;
            } else {
                lines.push(currentLine);
                currentLine = word;
            }
        }
        
        if (currentLine.length > 0) lines.push(currentLine);
        return lines.join('\n');
    }
}