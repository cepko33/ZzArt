export const CodeViewer = {
    props: ['code', 'maxHeight', 'color'],
    render() {
        return (
            <div 
                class="code-viewer" 
                v-html={this.code} 
                style={{ 
                    maxHeight: this.maxHeight || '250px',
                    color: this.color || ''
                }}
            ></div>
        );
    }
};
