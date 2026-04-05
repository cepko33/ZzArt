export const ControlRow = {
    props: ['label', 'sliderValue'],
    render() {
        const slots = this.$slots.default ? this.$slots.default() : null;
        return (
            <div class={["control-row", this.sliderValue !== undefined ? "slider-row" : ""]}>
                <span>
                    {this.label}
                    {this.sliderValue !== undefined && <span>: <span>{this.sliderValue}</span></span>}
                </span>
                {slots}
            </div>
        );
    }
};
