import {Keys} from '../../core/keys.enum';
import {EditMode} from '../../core/layers/abstract.layer';
import {PaintLayer} from '../../core/layers/paint.layer';
import {Point} from '../../core/point';
import {AbstractEditorPlugin} from './abstract-editor.plugin';

export class PaintPlugin extends AbstractEditorPlugin {
    lastPoint: Point;
    captured: boolean = false;

    onMouseDown(point: Point, event: MouseEvent): void {
        const {activeTool} = this.session.editor.state;
        if (activeTool?.getName() === 'paint') {
            this.captured = true;
            this.ensureActiveLayer();
            this.startEditing(point, event);
        }
    }

    private ensureActiveLayer(): void {
        if (!this.session.editor.state.activeLayer) {
            const selectedPaintLayers = this.session.state.layers.filter((l) => l.selected && l instanceof PaintLayer);
            if (selectedPaintLayers.length === 1) {
                this.session.editor.state.activeLayer = selectedPaintLayers[0];
            } else {
                const newLayer = this.session.editor.state.activeTool.createLayer();
                newLayer.selected = true;
                this.session.addLayer(newLayer);
                this.session.editor.state.activeLayer = newLayer;
            }
        }
    }

    private startEditing(point: Point, event: MouseEvent): void {
        const layer = this.session.editor.state.activeLayer;
        layer.startEdit(EditMode.CREATING, point);

        if (event.shiftKey && this.lastPoint) {
            layer.edit(this.lastPoint, event);
            layer.edit(point, event);
        } else {
            layer.edit(point.clone(), event);
        }
        this.lastPoint = point.clone().floor();
        this.session.virtualScreen.redraw(false);
    }

    onMouseMove(point: Point, event: MouseEvent): void {
        const {activeLayer} = this.session.editor.state;
        if (this.captured) {
            activeLayer.edit(point.clone(), event);
            this.session.virtualScreen.redraw(false);
            this.lastPoint = point;
        }
    }

    onMouseUp(point: Point, event: MouseEvent): void {
        const {activeLayer} = this.session.editor.state;
        if (this.captured) {
            activeLayer.stopEdit();
            this.captured = false;
            this.session.virtualScreen.redraw();
        }
    }

    onKeyDown(key: Keys, event: KeyboardEvent): void {
        const {activeLayer} = this.session.editor.state;
        if (activeLayer && key === Keys.Escape) {
            activeLayer.stopEdit();
            this.captured = false;
            this.session.virtualScreen.redraw();
            this.session.editor.state.activeTool = null;
            this.session.editor.state.activeLayer = null;
        }
    }

    onMouseDoubleClick(point, event): void {
        const selectedPaintLayers = this.session.state.layers.filter((l) => l.selected && l instanceof PaintLayer);
        if (selectedPaintLayers.length) {
            this.session.editor.state.activeLayer = selectedPaintLayers[0];
            this.session.editor.setTool('paint');
        }
    }

    onClear(): void {
        this.lastPoint = null;
    }
}
