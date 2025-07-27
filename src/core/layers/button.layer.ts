import {getFont} from '../../draw/fonts';
import {Font} from '../../draw/fonts/font';
import {DrawContext} from '../../draw/draw-context'; // Added for XOR rendering with temporary canvas
import {TPlatformFeatures} from '../../platforms/platform';
import {mapping} from '../decorators/mapping';
import {Point} from '../point';
import {Rect} from '../rect';
import {AbstractLayer, EditMode, TLayerEditPoint, TLayerModifiers, TModifierType} from './abstract.layer';

/**
 * ButtonLayer - Native u8g2 button implementation with XOR draw support
 * 
 * Features:
 * - Native u8g2 drawButtonUTF8 API integration
 * - XOR Draw mode (inverted) with pixel-perfect text cut-out
 * - Configurable padding, width, and text alignment
 * - Cross-platform code generation support
 * - Real-time visual preview in editor
 */
export class ButtonLayer extends AbstractLayer {
    protected type: ELayerType = 'button';
    protected editState: {
        firstPoint: Point;
        position: Point;
        size: Point;
        editPoint: TLayerEditPoint;
    } = null;

    // Button properties with u8g2 compatibility
    @mapping('p', 'point') public position: Point = new Point();
    @mapping('s', 'point') public size: Point = new Point(60, 20);
    @mapping('d') public text: string = 'Button';
    @mapping('f', 'font') public font: Font;
    @mapping('w') public width: number = 0; // minimum width for u8g2 drawButtonUTF8
    @mapping('ph') public paddingH: number = 2; // horizontal padding
    @mapping('pv') public paddingV: number = 2; // vertical padding
    @mapping('fl') public flags: number = 2; // U8G2_BTN_BW2 by default
    @mapping('tc') public textCenter: boolean = true; // text center horizontal alignment

    get minLen(): number {
        return 10;
    }

    modifiers: TLayerModifiers = {
        x: {
            getValue: () => this.position.x,
            setValue: (v: number) => {
                this.position.x = v;
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        y: {
            getValue: () => this.position.y,
            setValue: (v: number) => {
                this.position.y = v;
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        w: {
            getValue: () => this.size.x,
            setValue: (v: number) => {
                this.size.x = Math.max(v, this.minLen);
                // Also update u8g2 minimum width if size is smaller than current width
                if (v < this.width) {
                    this.width = Math.max(v, 0);
                }
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        h: {
            getValue: () => this.size.y,
            setValue: (v: number) => {
                this.size.y = Math.max(v, this.minLen);
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        text: {
            getValue: () => this.text,
            setValue: (v: string) => {
                this.text = v;
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.string,
        },
        font: {
            getValue: () => this.font?.name,
            setValue: (v: string) => {
                this.font = getFont(v);
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.font,
        },
        // Button-specific modifiers for u8g2 compatibility
        paddingH: {
            getValue: () => this.paddingH,
            setValue: (v: number) => {
                this.paddingH = Math.max(v, 0);
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        paddingV: {
            getValue: () => this.paddingV,
            setValue: (v: number) => {
                this.paddingV = Math.max(v, 0);
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.number,
        },
        flags: {
            getValue: () => this.flags,
            setValue: (v: number) => {
                this.flags = v;
                this.draw();
            },
            type: TModifierType.number,
        },
        textCenter: {
            getValue: () => this.textCenter,
            setValue: (v: boolean) => {
                this.textCenter = v;
                this.draw();
            },
            type: TModifierType.boolean,
        },
        color: {
            getValue: () => this.color,
            setValue: (v: string) => {
                this.color = v;
                this.updateBounds();
                this.draw();
            },
            type: TModifierType.color,
        },
        inverted: {
            getValue: () => this.inverted,
            setValue: (v: boolean) => {
                this.inverted = v;
                this.draw();
            },
            type: TModifierType.boolean,
        },
    };

    editPoints: TLayerEditPoint[] = [
        {
            cursor: 'nesw-resize',
            getRect: (): Rect =>
                new Rect(new Point(this.bounds.x + this.bounds.w, this.bounds.y), new Point(3)).subtract(
                    1.5,
                    1.5,
                    0,
                    0
                ),
            move: (offset: Point): void => {
                const size = new Point(this.editState.size.x - offset.x, this.editState.size.y + offset.y);
                const position = this.editState.position.clone().subtract(0, offset.y);
                if (size.x != this.size.x && size.x >= this.minLen) {
                    this.position.x = position.x;
                    this.size.x = size.x;
                }
                if (size.y != this.size.y && size.y >= this.minLen) {
                    this.position.y = position.y;
                    this.size.y = size.y;
                }
            },
        },
        {
            cursor: 'nwse-resize',
            getRect: (): Rect =>
                new Rect(
                    new Point(this.bounds.x + this.bounds.w, this.bounds.y + this.bounds.h),
                    new Point(3)
                ).subtract(1.5, 1.5, 0, 0),
            move: (offset: Point): void => {
                this.size = this.editState.size.clone().subtract(offset).max(new Point(this.minLen));
            },
        },
        {
            cursor: 'nesw-resize',
            getRect: (): Rect =>
                new Rect(new Point(this.bounds.x, this.bounds.y + this.bounds.h), new Point(3)).subtract(
                    1.5,
                    1.5,
                    0,
                    0
                ),
            move: (offset: Point): void => {
                const position = this.editState.position.clone().subtract(offset.x, 0);
                const size = this.editState.size.clone().add(offset.x, -offset.y);
                if (size.x != this.size.x && size.x >= this.minLen) {
                    this.position.x = position.x;
                    this.size.x = size.x;
                }
                if (size.y != this.size.y && size.y >= this.minLen) {
                    this.position.y = position.y;
                    this.size.y = size.y;
                }
            },
        },
        {
            cursor: 'nwse-resize',
            getRect: (): Rect =>
                new Rect(new Point(this.bounds.x, this.bounds.y), new Point(3)).subtract(1.5, 1.5, 0, 0),
            move: (offset: Point): void => {
                const position = this.editState.position.clone().subtract(offset);
                const size = this.editState.size.clone().add(offset);
                if (size.x != this.size.x && size.x >= this.minLen) {
                    this.position.x = position.x;
                    this.size.x = size.x;
                }
                if (size.y != this.size.y && size.y >= this.minLen) {
                    this.size.y = size.y;
                    this.position.y = position.y;
                }
            },
        },
    ];

    constructor(protected features: TPlatformFeatures, font?: Font) {
        super(features);
        
        // Remove unsupported modifiers based on platform capabilities
        if (!this.features.hasRGBSupport && !this.features.hasIndexedColors) {
            delete this.modifiers.color;
        }
        if (!this.features.hasInvertedColors) {
            delete this.modifiers.inverted;
        }
        this.color = this.features.defaultColor;
        
        // Set default font if provided
        if (font) {
            this.font = font;
        }
    }

    startEdit(mode: EditMode, point: Point, editPoint: TLayerEditPoint) {
        this.pushHistory();
        this.mode = mode;
        if (mode == EditMode.CREATING) {
            this.position = point.clone();
            this.size = new Point(60, 20);
            this.updateBounds();
            this.draw();
        }
        this.editState = {
            firstPoint: point,
            position: this.position.clone(),
            size: this.size.clone(),
            editPoint,
        };
    }

    edit(point: Point, originalEvent: MouseEvent) {
        if (!this.editState) {
            return;
        }
        const {position, size, firstPoint, editPoint} = this.editState;
        switch (this.mode) {
            case EditMode.MOVING:
                this.position = position.clone().add(point.clone().subtract(firstPoint)).round();
                break;
            case EditMode.RESIZING:
                editPoint.move(firstPoint.clone().subtract(point));
                break;
            case EditMode.CREATING:
                const newSize = point.clone().subtract(firstPoint).abs().max(new Point(this.minLen));
                this.size = newSize;
                if (originalEvent.altKey) {
                    this.position = firstPoint.clone().subtract(newSize.clone().divide(2));
                } else {
                    const signs = point.clone().subtract(firstPoint).xy.map(Math.sign);
                    this.position = firstPoint.min(firstPoint.clone().add(newSize.clone().multiply(signs)));
                }
                break;
        }
        this.updateBounds();
        this.draw();
    }

    stopEdit() {
        this.mode = EditMode.NONE;
        this.editState = null;
        this.pushRedoHistory();
    }

    /**
     * Renders the button with support for both normal and XOR (inverted) modes.
     * 
     * Normal mode: Draws outlined button with normal text rendering
     * XOR mode: Draws filled button with text cut out using destination-out composition
     * 
     * Technical details:
     * - Disables antialiasing for pixel-perfect rendering
     * - Uses consistent font rendering between modes
     * - Supports text centering and custom padding
     */
    draw() {
        const {dc, position, size} = this;
        // Always clear the canvas first to ensure clean state
        dc.clear();
        
        // Set colors for drawing
        dc.ctx.fillStyle = this.color;
        dc.ctx.strokeStyle = this.color;
        
        if (this.inverted) {
            // XOR MODE: When inverted, draw filled button with hollow text
            dc.pixelateRoundedRect(position, size, 2, true); // filled=true
            
            // Draw text as "holes" in the filled button if font is available
            if (this.font && this.text) {
                const textSize = this.font.getSize(dc, this.text, 1);
                const textX = this.textCenter ? 
                    position.x + (size.x - textSize.x) / 2 : 
                    position.x + this.paddingH;
                const textY = position.y + (size.y + textSize.y) / 2;
                
                // Use destination-out directly with the font rendering to avoid double-rendering artifacts
                dc.ctx.save();
                
                // Disable antialiasing to prevent pixel bleeding that can cause bold effect
                dc.ctx.imageSmoothingEnabled = false;
                dc.ctx.globalCompositeOperation = 'destination-out';
                
                // Set the exact same rendering properties as normal text
                dc.ctx.fillStyle = this.color;
                dc.ctx.strokeStyle = this.color;
                
                // Draw text directly with destination-out to create clean cut-out
                this.font.drawText(dc, this.text, new Point(textX, textY), 1);
                
                dc.ctx.restore();
            }
        } else {
            // NORMAL MODE: outline button with normal text
            dc.pixelateRoundedRect(position, size, 2, false); // filled=false
            
            // Draw text normally if font is available
            if (this.font && this.text) {
                const textSize = this.font.getSize(dc, this.text, 1);
                const textX = this.textCenter ? 
                    position.x + (size.x - textSize.x) / 2 : 
                    position.x + this.paddingH;
                const textY = position.y + (size.y + textSize.y) / 2;
                
                // Ensure normal rendering - reset any composite operations and disable antialiasing
                dc.ctx.save();
                dc.ctx.imageSmoothingEnabled = false;
                dc.ctx.globalCompositeOperation = 'source-over';
                dc.ctx.fillStyle = this.color;
                this.font.drawText(dc, this.text, new Point(textX, textY), 1);
                dc.ctx.restore();
            }
        }
    }

    onLoadState() {
        this.updateBounds();
        this.mode = EditMode.NONE;
    }

    updateBounds(): void {
        this.bounds = new Rect(this.position, this.size);
    }
}
