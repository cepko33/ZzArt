import { state } from '../../state';
import { ControlRow } from '../ControlRow';
import { UpdateFeedbackUI } from '../../ui/ui';

export const FeedbackSettings = {
    props: ['chromaKeyHex'],
    render() {
        if (!state.favoriteShader) return null;
        const fsActive = state.favoriteShader;

        return (
            <details class="advanced-group">
                <summary>🌀 Feedback</summary>
                <div class="control-row">
                    <label>
                        <input
                            type="checkbox"
                            v-model={fsActive.useFeedback}
                            onChange={UpdateFeedbackUI}
                        />{' '}
                        <b>Enable</b>
                    </label>
                    <label>
                        <input type="checkbox" v-model={state.feedback.locked} /> Lock
                    </label>
                    <label>
                        <input
                            type="checkbox"
                            v-model={fsActive.feedbackSwap}
                            onChange={UpdateFeedbackUI}
                        />{' '}
                        Swap
                    </label>
                </div>

                <ControlRow label="Blend">
                    <select v-model={fsActive.feedbackBlendMode} onChange={UpdateFeedbackUI}>
                        <option value={0}>0 - Mix</option>
                        <option value={1}>1 - Additive</option>
                        <option value={2}>2 - Multiply</option>
                        <option value={3}>3 - Screen</option>
                        <option value={4}>4 - Difference</option>
                        <option value={5}>5 - Lighten</option>
                        <option value={6}>6 - Darken</option>
                        <option value={7}>7 - Burn</option>
                        <option value={8}>8 - Atop</option>
                    </select>
                </ControlRow>

                <ControlRow
                    label="Mix"
                    sliderValue={Number(fsActive.feedbackAmount ?? 0).toFixed(2)}
                >
                    <input
                        type="range"
                        min="0.5"
                        max="0.99"
                        step="0.01"
                        v-model={fsActive.feedbackAmount}
                        onInput={UpdateFeedbackUI}
                    />
                </ControlRow>

                <ControlRow label="Mask">
                    <select v-model={fsActive.feedbackMaskType} onChange={UpdateFeedbackUI}>
                        <option value={0}>0 - None</option>
                        <option value={1}>1 - Luminance</option>
                        <option value={2}>2 - Red Channel</option>
                        <option value={3}>3 - Edge Detect</option>
                        <option value={4}>4 - Hue Distance</option>
                        <option value={5}>5 - Alpha Channel</option>
                        <option value={6}>6 - Chroma Key</option>
                    </select>
                </ControlRow>

                {fsActive.feedbackMaskType === 6 && (
                    <div class="chroma-settings">
                        <ControlRow label="Key">
                            <select v-model={fsActive.chromaMode} onChange={UpdateFeedbackUI}>
                                <option value={0}>RGB</option>
                                <option value={1}>Hue</option>
                                <option value={2}>Sat</option>
                                <option value={3}>Val</option>
                            </select>
                            <input
                                type="color"
                                value={this.chromaKeyHex}
                                onInput={(e) => this.$emit('update:chromaKeyHex', e.target.value)}
                            />
                        </ControlRow>
                        <ControlRow
                            label="Thr"
                            sliderValue={Number(fsActive.chromaThreshold ?? 0).toFixed(2)}
                        >
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                v-model={fsActive.chromaThreshold}
                                onInput={UpdateFeedbackUI}
                            />
                        </ControlRow>
                        <ControlRow
                            label="Soft"
                            sliderValue={Number(fsActive.chromaSoftness ?? 0).toFixed(2)}
                        >
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.01"
                                v-model={fsActive.chromaSoftness}
                                onInput={UpdateFeedbackUI}
                            />
                        </ControlRow>
                    </div>
                )}
                <ControlRow label="Mod">
                    <select v-model={fsActive.feedbackModType} onChange={UpdateFeedbackUI}>
                        <option value={0}>0 - None</option>
                        <option value={1}>1 - Distort</option>
                        <option value={2}>2 - Displace</option>
                        <option value={3}>3 - Scale</option>
                        <option value={4}>4 - Rotate</option>
                    </select>
                </ControlRow>

                <ControlRow
                    label="Mod Amt"
                    sliderValue={Number(fsActive.feedbackModAmount ?? 0).toFixed(2)}
                >
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        v-model={fsActive.feedbackModAmount}
                        onInput={UpdateFeedbackUI}
                    />
                </ControlRow>

                <ControlRow label="Order">
                    <select v-model={fsActive.feedbackOpOrder} onChange={UpdateFeedbackUI}>
                        <option value={0}>0 - Standard</option>
                        <option value={1}>1 - Mask-gate</option>
                        <option value={2}>2 - Inv-gate</option>
                        <option value={3}>3 - Warp-then-mask</option>
                        <option value={4}>4 - Mask-steers-UV</option>
                        <option value={5}>5 - Mod-vs-amount</option>
                    </select>
                </ControlRow>

                <ControlRow
                    label="Sharp"
                    sliderValue={Number(fsActive.feedbackSharpen ?? 0).toFixed(2)}
                >
                    <input
                        type="range"
                        min="-1"
                        max="2"
                        step="0.01"
                        v-model={fsActive.feedbackSharpen}
                        onInput={UpdateFeedbackUI}
                    />
                </ControlRow>

                <ControlRow
                    label="Blur"
                    sliderValue={Number(fsActive.feedbackBlur ?? 0).toFixed(2)}
                >
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        v-model={fsActive.feedbackBlur}
                        onInput={UpdateFeedbackUI}
                    />
                </ControlRow>
            </details>
        );
    },
};
