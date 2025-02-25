import {Keys} from '../../core/keys.enum';
import {AbstractLayer} from '../../core/layers/abstract.layer';
import {Point} from '../../core/point';
import {Rect} from '../../core/rect';
import {Session} from '../../core/session';
import {AbstractEditorPlugin} from './abstract-editor.plugin';

export class SelectPlugin extends AbstractEditorPlugin {
    captured: boolean = false;
    foreign: boolean = false; // will be true if mouse down event was outside virtual screen
    selectionElement: HTMLElement;
    firstPoint: Point = null;
    selectionRect: Rect = null;
    grabMode: boolean = false;

    constructor(
        protected session: Session,
        protected container: HTMLElement
    ) {
        super(session, container);
        this.selectionElement = document.createElement('div');
        this.selectionElement.classList.add('fui-canvas__selection');
        this.container.appendChild(this.selectionElement);
    }

    onMouseDown(point: Point, event: MouseEvent): void {
        this.foreign = false;
        this.grabMode = false;
        const {layers} = this.session.state;
        const {activeTool} = this.session.editor.state;
        if (!activeTool) {
            if (event.altKey) {
                this.captured = true;
                this.grabMode = true;
                this.firstPoint = point.clone();
            } else {
                const hovered = layers.filter((l) => !l.locked && l.contains(point)).sort((a, b) => b.index - a.index);
                if (hovered.length) {
                    // if there is a hovered layer
                    const upperLayer = hovered[0];
                    if (event.shiftKey && !upperLayer.locked) {
                        // add or remove from selection if shift is pressed
                        upperLayer.selected = !upperLayer.selected;
                    } else if (!upperLayer.selected && !upperLayer.locked) {
                        // if upper layer is not selected, select it and unselect others
                        // if upper is selected then it will move all
                        this.session.state.layers.forEach((l) => (l.selected = false));
                        upperLayer.selected = true;
                    }
                } else {
                    // if there is no hovered layer, start box selection
                    this.captured = true;
                    this.firstPoint = point.clone();
                }
                this.session.editor.selectionUpdate();
            }
        }
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        if (this.captured) {
            const {scale} = this.session.state;
            const {interfaceColors} = this.session.getPlatformFeatures();
            const screenPoint = point.clone().multiply(scale);
            const position = this.firstPoint.clone().multiply(scale).min(screenPoint);
            const size = point.clone().subtract(this.firstPoint).abs().multiply(scale);
            Object.assign(this.selectionElement.style, {
                display: 'block',
                borderColor: interfaceColors.selectionStrokeColor,
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${size.x}px`,
                height: `${size.y}px`,
            });
        }
    }

    private intersect(layer: AbstractLayer, position: Point, size: Point): boolean {
        const layerInBounds = new Rect(position, size).intersect(layer.bounds);
        if (layerInBounds) {
            for (let x = 0; x < size.x; x++) {
                for (let y = 0; y < size.y; y++) {
                    const point = position.clone().add(x, y);
                    if (layer.contains(point)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    onMouseUp(point: Point, event: MouseEvent): void {
        const {layers, display, scale} = this.session.state;
        if (this.captured) {
            // selection box logic
            this.captured = false;
            this.selectionElement.style.display = 'none';
            const position = this.firstPoint.clone().min(point);
            const size = point.clone().subtract(this.firstPoint).abs();
            if (this.grabMode) {
                this.session.grab(position, size);
            } else {
                if (size.x < 2 && size.y < 2) {
                    layers.filter((l) => l.selected).forEach((l) => (l.selected = false));
                    this.session.editor.selectionUpdate();
                    return;
                }
                layers
                    .filter((l) => !l.locked)
                    .forEach((l) => (l.selected = new Rect(position, size).intersect(l.bounds)));
            }
            layers.filter((l) => !l.locked).forEach((l) => (l.selected = this.intersect(l, position, size)));
        } else if (!this.foreign) {
            // just a click
            const selected = layers.filter((l) => l.selected && !l.locked);
            const hovered = layers.filter((l) => l.contains(point));
            // if no layers are hovered, deselect all
            if (!hovered.length) {
                selected.forEach((layer) => (layer.selected = false));
            }
        }
        this.foreign = true;
        this.session.editor.selectionUpdate();
    }

    onKeyDown(key: Keys, event: KeyboardEvent): void {
        const {layers} = this.session.state;
        if (this.session.editor.state.activeTool) return;
        if (key === Keys.Escape) {
            layers.forEach((l) => (l.selected = false));
            this.session.virtualScreen.redraw(false);
        } else if (key === Keys.KeyA && (event.ctrlKey || event.metaKey)) {
            layers.filter((l) => !l.locked).forEach((l) => (l.selected = true));
            this.session.virtualScreen.redraw(false);
        }
        this.session.editor.selectionUpdate();
    }
}
