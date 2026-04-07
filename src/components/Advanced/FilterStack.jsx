import { state } from '../../state';
import { ControlRow } from '../ControlRow';
import { UpdateFeedbackUI } from '../../ui/ui';

export const FilterStack = {
    props: ['title', 'stack'],
    methods: {
        addFilter(name) {
            const f = state.postProcessFunctions.find((pf) => pf.name === name);
            if (!f) return;
            this.stack.push({
                name: f.name,
                params: state.favoriteShader._generateDefaultParams(f.name),
                enabled: true,
            });
            UpdateFeedbackUI();
        },
        removeFilter(index) {
            this.stack.splice(index, 1);
            UpdateFeedbackUI();
        },
        moveFilter(index, dir) {
            const newIndex = index + dir;
            if (newIndex < 0 || newIndex >= this.stack.length) return;
            const item = this.stack.splice(index, 1)[0];
            this.stack.splice(newIndex, 0, item);
            UpdateFeedbackUI();
        },
    },
    render() {
        if (!state.favoriteShader) return null;

        return (
            <details class="advanced-group filter-stack">
                <summary>
                    ✨ {this.title} ({this.stack.length})
                </summary>
                <div class="filter-list">
                    {this.stack.map((filter, index) => (
                        <div class={['filter-item', !filter.enabled ? 'disabled' : '']} key={index}>
                            <div class="filter-header">
                                <input
                                    type="checkbox"
                                    v-model={filter.enabled}
                                    onChange={UpdateFeedbackUI}
                                />
                                <span class="filter-name">{filter.name}</span>
                                <div class="filter-actions">
                                    <button onClick={() => this.moveFilter(index, -1)}>▲</button>
                                    <button onClick={() => this.moveFilter(index, 1)}>▼</button>
                                    <button
                                        class="btn-remove"
                                        onClick={() => this.removeFilter(index)}
                                    >
                                        ×
                                    </button>
                                </div>
                            </div>

                            {filter.enabled && (
                                <div class="filter-params">
                                    {Object.keys(filter.params).map((key) => {
                                        const rawVal = filter.params[key];
                                        const isNumberValue = typeof rawVal === 'number' || (typeof rawVal === 'string' && !isNaN(parseFloat(rawVal)));
                                        
                                        if (isNumberValue) {
                                            const val = Number(rawVal);
                                            return (
                                                <ControlRow
                                                    label={key}
                                                    sliderValue={val.toFixed(2)}
                                                    key={key}
                                                >
                                                    <input
                                                        type="range"
                                                        min="-1"
                                                        max="2"
                                                        step="0.01"
                                                        value={val}
                                                        onInput={(e) => {
                                                            filter.params[key] = Number(e.target.value);
                                                            UpdateFeedbackUI();
                                                        }}
                                                    />
                                                </ControlRow>
                                            );
                                        } else if (rawVal && typeof rawVal.x === 'number') {
                                            const val = rawVal;
                                            // Handle vec3 color if needed (uncommon in auto-gen but possible)
                                            return (
                                                <ControlRow label={key} key={key}>
                                                    <div class="color-preview" style={{background: `rgb(${val.x*255},${val.y*255},${val.z*255})`}}></div>
                                                </ControlRow>
                                            );
                                        }
                                        return null;
                                    })}
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div class="add-filter">
                    <select onChange={(e) => { this.addFilter(e.target.value); e.target.value = ''; }}>
                        <option value="">+ Add Filter...</option>
                        {state.postProcessFunctions.map((f) => (
                            <option key={f.name} value={f.name}>
                                {f.name}
                            </option>
                        ))}
                    </select>
                </div>
            </details>
        );
    },
};
