import Konva from 'konva';

/**
 * Wraps text to fit within maxWidth, using word boundaries where possible
 * and character boundaries for words that exceed the width.
 *
 * Uses Konva's own Text node for pixel-perfect measurement with loaded fonts.
 * This replaces Konva's built-in wrap behavior entirely for reliability.
 *
 * Behavior matches CSS `overflow-wrap: break-word; word-wrap: break-word`:
 *   - Text wraps at word/space boundaries
 *   - Only words individually wider than the container break mid-character
 */
export function wrapText(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number = 400,
  fontStyle: string = 'normal',
): string {
  if (!text || maxWidth <= 0) return text;

  // Create a temporary Konva Text node for measurement
  // This uses the exact same font rendering as the final display
  const measureNode = new Konva.Text({
    text: '',
    fontSize,
    fontFamily,
    fontStyle: `${fontWeight} ${fontStyle}`,
  });

  const measure = (str: string): number => {
    measureNode.text(str);
    return measureNode.width();
  };

  // Break a single word at character boundaries to fit maxWidth
  const breakWord = (word: string): string[] => {
    const lines: string[] = [];
    let current = '';
    for (const char of word) {
      if (current && measure(current + char) > maxWidth) {
        lines.push(current);
        current = char;
      } else {
        current += char;
      }
    }
    if (current) lines.push(current);
    return lines;
  };

  const outputLines: string[] = [];

  // Process each explicit line (user-entered newlines)
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ');
    let currentLine = '';

    for (const word of words) {
      if (!word) {
        // Preserve multiple spaces as space separators
        if (currentLine) currentLine += ' ';
        continue;
      }

      // Check if the word itself exceeds maxWidth
      if (measure(word) > maxWidth) {
        // Flush current line first
        if (currentLine) {
          outputLines.push(currentLine);
          currentLine = '';
        }
        // Break the word into fitting chunks
        const chunks = breakWord(word);
        // Add all chunks except last as completed lines
        for (let i = 0; i < chunks.length - 1; i++) {
          outputLines.push(chunks[i]);
        }
        // Last chunk becomes current line (may have more words after)
        currentLine = chunks[chunks.length - 1] || '';
        continue;
      }

      // Try to add word to current line
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (measure(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        // Word doesn't fit — push current line and start new one
        if (currentLine) outputLines.push(currentLine);
        currentLine = word;
      }
    }

    // Flush remaining text for this paragraph
    outputLines.push(currentLine);
  }

  measureNode.destroy();
  return outputLines.join('\n');
}
