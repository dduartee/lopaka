import {AbstractLayer} from '../../core/layers/abstract.layer';
import {ButtonLayer} from '../../core/layers/button.layer';
import {U8g2Platform} from '../../platforms/u8g2';
import {Uint32RawPlatform} from '../../platforms/uint32-raw';
import {AbstractTool} from './abstract.tool';
import {getFont} from '../../draw/fonts';
import {Point} from '../../core/point';

export class ButtonTool extends AbstractTool {
    name = 'button';
    title = 'Button';

    createLayer(): AbstractLayer {
        const {session} = this.editor;
        
        const fonts = [...session.platforms[session.state.platform].getFonts(), ...session.state.customFonts];
        const lastFontName = session.editor.lastFontName;
        const selectedFont = lastFontName ? fonts.find((font) => font.name === lastFontName) || fonts[0] : fonts[0];
        const font = getFont(selectedFont.name);
        
        return new ButtonLayer(session.getPlatformFeatures(), font);
    }

    isSupported(platform: string): boolean {
        return [U8g2Platform.id, Uint32RawPlatform.id].includes(platform);
    }

    onStopEdit(layer: ButtonLayer, position: Point, originalEvent: MouseEvent): void {
        super.onStopEdit(layer, position, originalEvent);
        if (layer.font) {
            this.editor.font = layer.font;
        }
    }
}
