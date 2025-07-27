import {Point} from '../../core/point';
import {xbmpToImgData} from '../../utils';
import {AbstractParser} from './abstract-parser';

export class U8g2Parser extends AbstractParser {
    importSourceCode(sourceCode: string) {
        const {defines, images, methods, variables} = this.parseSourceCode(sourceCode);

        const states = [];
        let currentFont = '4x6';
        let currentDrawColor = 1; // Track draw color for inverted mode
        const warnings = [];
        methods.forEach((call) => {
            if (call.functionName.includes('u8g2_')) {
                call.args.shift();
            }
            switch (call.functionName) {
                case 'u8g2_SetFont':
                case 'setFont':
                    {
                        const [font] = this.getArgs(call.args, defines, variables);
                        currentFont = font.replace('_tr', '').replace('u8g2_font_', '').replace('u8g_font_', '');
                    }
                    break;
                case 'u8g2_SetDrawColor':
                case 'setDrawColor':
                    {
                        const [color] = this.getArgs(call.args, defines, variables);
                        currentDrawColor = parseInt(color);
                    }
                    break;
                case 'u8g2_DrawXBMP':
                case 'u8g2_DrawXBM':
                case 'drawXBMP':
                case 'drawXBM':
                    {
                        const [x, y, width, height, name] = this.getArgs(call.args, defines, variables);
                        let imageName = this.parseImageName(name);
                        if (!images.get(imageName)) {
                            warnings.push(`Bitmap array declaration for ${name} was not found. Skipping.`);
                            break;
                        }
                        states.push({
                            type: 'paint',
                            data: xbmpToImgData(images.get(imageName), width, height),
                            position: new Point(parseInt(x), parseInt(y)),
                            size: new Point(parseInt(width), parseInt(height)),
                            imageName,
                        });
                    }
                    break;
                case 'u8g2_DrawLine':
                case 'drawLine':
                    {
                        const [x1, y1, x2, y2] = this.getArgs(call.args, defines, variables);
                        states.push({
                            type: 'line',
                            p1: new Point(parseInt(x1), parseInt(y1)),
                            p2: new Point(parseInt(x2), parseInt(y2)),
                            inverted: currentDrawColor === 2,
                        });
                    }
                    break;
                case 'u8g2_DrawBox':
                case 'u8g2_DrawFrame':
                case 'drawBox':
                case 'drawFrame':
                    {
                        const [x, y, width, height] = this.getArgs(call.args, defines, variables);
                        states.push({
                            type: 'rect',
                            position: new Point(parseInt(x), parseInt(y)),
                            size: new Point(parseInt(width), parseInt(height)),
                            fill: call.functionName === 'drawBox' || call.functionName === 'u8g2_DrawBox',
                            inverted: currentDrawColor === 2,
                        });
                    }
                    break;
                case 'u8g2_DrawPixel':
                case 'drawPixel':
                    {
                        const [x, y] = this.getArgs(call.args, defines, variables);
                        states.push({
                            type: 'dot',
                            position: new Point(parseInt(x), parseInt(y)),
                            inverted: currentDrawColor === 2,
                        });
                    }
                    break;
                case 'u8g2_DrawStr':
                case 'u8g2_DrawUTF8':
                case 'drawStr':
                case 'drawUTF8':
                    {
                        const [x, y, text] = this.getArgs(call.args, defines, variables);
                        states.push({
                            type: 'string',
                            text: text ? text.replace(/"/g, '') : 'Text',
                            position: new Point(parseInt(x), parseInt(y)),
                            font: currentFont,
                            inverted: currentDrawColor === 2, // Set inverted if draw color is 2 (XOR mode)
                        });
                    }
                    break;
                case 'u8g2_DrawButtonUTF8':
                case 'drawButtonUTF8':
                    {
                        const [x, y, flags, width, paddingH, paddingV, text] = this.getArgs(call.args, defines, variables);
                        const flagsNum = parseInt(flags);
                        states.push({
                            type: 'button',
                            text: text ? text.replace(/"/g, '') : 'Button',
                            position: new Point(parseInt(x), parseInt(y)),
                            font: currentFont,
                            flags: flagsNum,
                            width: parseInt(width) || 0,
                            paddingH: parseInt(paddingH) || 2,
                            paddingV: parseInt(paddingV) || 2,
                            textCenter: (flagsNum & 64) !== 0, // U8G2_BTN_HCENTER flag
                            inverted: (flagsNum & 8) !== 0 || currentDrawColor === 2, // U8G2_BTN_INV flag or XOR draw color
                        });
                    }
                    break;
                case 'u8g2_DrawCircle':
                case 'u8g2_DrawDisc':
                case 'drawCircle':
                case 'drawDisc': {
                    const [x, y, radius] = this.getArgs(call.args, defines, variables);
                    states.push({
                        type: 'circle',
                        position: new Point(parseInt(x) - parseInt(radius), parseInt(y) - parseInt(radius)),
                        radius: parseInt(radius),
                        fill: call.functionName === 'drawDisc' || call.functionName === 'u8g2_DrawDisc',
                        inverted: currentDrawColor === 2,
                    });
                    break;
                }
                case 'u8g2_DrawEllipse':
                case 'u8g2_DrawFilledEllipse':
                case 'drawEllipse':
                case 'drawFilledEllipse':
                    {
                        const [x, y, rx, ry] = this.getArgs(call.args, defines, variables);
                        states.push({
                            type: 'ellipse',
                            position: new Point(parseInt(x) - parseInt(rx), parseInt(y) - parseInt(ry)),
                            rx: parseInt(rx),
                            ry: parseInt(ry),
                            fill: call.functionName === 'drawFilledEllipse' || call.functionName === 'u8g2_DrawFilledEllipse',
                            inverted: currentDrawColor === 2,
                        });
                    }
                    break;
            }
        });
        return {states, warnings};
    }
}
