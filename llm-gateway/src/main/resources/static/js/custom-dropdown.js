/**
 * Custom dropdown component.
 */

(function(global) {
    'use strict';

    class CustomDropdown {
        constructor(element, options = {}) {
            this.element = element;
            this.options = {
                placeholder: options.placeholder || '请选择',
                allowClear: options.allowClear !== false,
                disabled: element.dataset.disabled === 'true',
                onChange: options.onChange || null,
                onOpen: options.onOpen || null,
                onClose: options.onClose || null,
                ...options
            };

            this.isOpen = false;
            this.selectedValue = null;
            this.selectedText = null;
            this.highlightedIndex = -1;
            this.items = [];
            this.initialValue = undefined;

            this.init();
        }

        init() {
            this.createStructure();
            CustomDropdown.instances.add(this);
            CustomDropdown.ensureGlobalListeners();
            this.attachEvents();
            this.updateState();
        }

        createStructure() {
            this.element.innerHTML = '';
            this.element.classList.add('custom-dropdown');
            this.element.classList.toggle('disabled', this.options.disabled);

            this.trigger = document.createElement('button');
            this.trigger.type = 'button';
            this.trigger.className = 'custom-dropdown-trigger';
            this.trigger.setAttribute('aria-haspopup', 'listbox');
            this.trigger.setAttribute('aria-expanded', 'false');
            this.trigger.setAttribute('aria-label', this.element.dataset.label || '下拉菜单');

            this.valueContainer = document.createElement('span');
            this.valueContainer.className = 'custom-dropdown-value empty';
            this.valueContainer.textContent = this.options.placeholder;
            this.trigger.appendChild(this.valueContainer);

            const arrowContainer = document.createElement('span');
            arrowContainer.className = 'custom-dropdown-arrow';
            arrowContainer.innerHTML = `
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            `;
            this.trigger.appendChild(arrowContainer);
            this.element.appendChild(this.trigger);

            this.panel = document.createElement('div');
            this.panel.className = 'custom-dropdown-panel';
            this.panel.setAttribute('role', 'listbox');

            this.list = document.createElement('ul');
            this.list.className = 'custom-dropdown-list';
            this.panel.appendChild(this.list);
            this.element.appendChild(this.panel);
        }

        attachEvents() {
            this.trigger.addEventListener('click', () => {
                this.toggle();
            });

            this.trigger.addEventListener('keydown', (e) => this.handleTriggerKeydown(e));
            this.panel.addEventListener('click', () => {});
        }

        handleTriggerKeydown(e) {
            if (!this.isOpen) {
                if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.open();
                }
                return;
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.moveHighlight(1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.moveHighlight(-1);
                    break;
                case 'Enter':
                case ' ':
                    e.preventDefault();
                    if (this.highlightedIndex >= 0) {
                        this.selectItem(this.highlightedIndex);
                    }
                    break;
                case 'Escape':
                    this.close();
                    break;
            }
        }

        moveHighlight(delta) {
            const itemCount = this.items.length;
            if (itemCount === 0) {
                return;
            }

            this.highlightedIndex += delta;
            if (this.highlightedIndex < 0) {
                this.highlightedIndex = itemCount - 1;
            } else if (this.highlightedIndex >= itemCount) {
                this.highlightedIndex = 0;
            }

            this.updateHighlight();
            this.scrollToHighlighted();
        }

        updateHighlight() {
            this.items.forEach((item, index) => {
                item.element.classList.toggle('highlighted', index === this.highlightedIndex);
            });
        }

        scrollToHighlighted() {
            if (this.highlightedIndex < 0 || !this.items[this.highlightedIndex]) {
                return;
            }

            const itemElement = this.items[this.highlightedIndex].element;
            const panelRect = this.panel.getBoundingClientRect();
            const itemRect = itemElement.getBoundingClientRect();

            if (itemRect.top < panelRect.top) {
                itemElement.scrollIntoView({ block: 'start' });
            } else if (itemRect.bottom > panelRect.bottom) {
                itemElement.scrollIntoView({ block: 'end' });
            }
        }

        toggle() {
            if (this.options.disabled) {
                return;
            }

            if (this.isOpen) {
                this.close();
            } else {
                this.open();
            }
        }

        open() {
            if (this.options.disabled || this.isOpen || this.items.length === 0) {
                return;
            }

            this.isOpen = true;
            this.element.classList.add('open');
            this.trigger.setAttribute('aria-expanded', 'true');

            if (typeof this.options.onOpen === 'function') {
                this.options.onOpen(this);
            }

            requestAnimationFrame(() => {
                if (this.selectedValue !== null) {
                    const index = this.items.findIndex(item => item.value === this.selectedValue);
                    this.highlightedIndex = index >= 0 ? index : 0;
                } else {
                    this.highlightedIndex = 0;
                }

                this.updateHighlight();
                this.scrollToHighlighted();
            });
        }

        close() {
            if (!this.isOpen) {
                return;
            }

            this.isOpen = false;
            this.element.classList.remove('open');
            this.trigger.setAttribute('aria-expanded', 'false');
            this.highlightedIndex = -1;
            this.items.forEach(item => item.element.classList.remove('highlighted'));

            if (typeof this.options.onClose === 'function') {
                this.options.onClose(this);
            }
        }

        selectItem(index) {
            if (index < 0 || index >= this.items.length) {
                return;
            }

            const item = this.items[index];
            this.selectedValue = item.value;
            this.selectedText = item.text;
            this.updateState();
            this.close();
            this.trigger.focus();
            this.dispatchChangeEvent();

            if (typeof this.options.onChange === 'function') {
                this.options.onChange(this, item.value, item.text);
            }
        }

        updateState() {
            const hasSelection = this.selectedValue !== null;
            this.valueContainer.textContent = hasSelection
                ? (this.selectedText || this.selectedValue)
                : this.options.placeholder;
            this.valueContainer.classList.toggle('empty', !hasSelection);

            this.items.forEach(item => {
                const isSelected = item.value === this.selectedValue;
                item.element.classList.toggle('selected', isSelected);
                item.element.setAttribute('aria-selected', isSelected ? 'true' : 'false');
            });
        }

        setOptions(options) {
            this.items = options.map(opt => ({
                value: opt && opt.value !== undefined ? opt.value : opt,
                text: opt && (opt.text || opt.label) ? (opt.text || opt.label) : String(opt && opt.value !== undefined ? opt.value : opt)
            }));

            this.list.innerHTML = '';

            this.items.forEach((item, index) => {
                const li = document.createElement('li');
                li.className = 'custom-dropdown-item';
                li.setAttribute('role', 'option');
                li.setAttribute('aria-selected', 'false');
                li.setAttribute('tabindex', '-1');

                const textSpan = document.createElement('span');
                textSpan.className = 'custom-dropdown-item-text';
                textSpan.textContent = item.text;
                li.appendChild(textSpan);

                li.addEventListener('click', () => {
                    this.selectItem(index);
                });

                li.addEventListener('mouseenter', () => {
                    this.highlightedIndex = index;
                    this.updateHighlight();
                });

                this.list.appendChild(li);
                item.element = li;
            });

            if (this.initialValue !== undefined) {
                this.setValue(this.initialValue);
            } else {
                this.updateState();
            }
        }

        addOption(value, text) {
            const option = {
                value: value !== undefined ? value : text,
                text: text || String(value)
            };

            this.setOptions([
                ...this.items.map(item => ({ value: item.value, text: item.text })),
                option
            ]);
        }

        setValue(value) {
            this.initialValue = value;
            const item = this.items.find(opt => opt.value === value);
            if (!item) {
                return;
            }

            this.selectedValue = item.value;
            this.selectedText = item.text;
            this.updateState();
        }

        getValue() {
            return this.selectedValue;
        }

        getText() {
            return this.selectedText;
        }

        clear() {
            if (!this.options.allowClear) {
                return;
            }

            this.selectedValue = null;
            this.selectedText = null;
            this.updateState();
            this.dispatchChangeEvent();

            if (typeof this.options.onChange === 'function') {
                this.options.onChange(this, null, null);
            }
        }

        dispatchChangeEvent() {
            this.element.dispatchEvent(new CustomEvent('change', {
                bubbles: true,
                detail: {
                    value: this.selectedValue,
                    text: this.selectedText
                }
            }));
        }

        setEnabled(enabled) {
            this.options.disabled = !enabled;
            this.element.classList.toggle('disabled', !enabled);
            if (!enabled) {
                this.close();
            }
        }

        destroy() {
            this.close();
            CustomDropdown.instances.delete(this);
            this.element.innerHTML = '';
            this.element.classList.remove('custom-dropdown', 'disabled', 'open');
            delete this.element._dropdownInstance;
        }
    }

    CustomDropdown.instances = new Set();
    CustomDropdown.globalListenersAttached = false;
    CustomDropdown.ensureGlobalListeners = function() {
        if (CustomDropdown.globalListenersAttached) {
            return;
        }

        document.addEventListener('click', (e) => {
            CustomDropdown.instances.forEach(instance => {
                const clickedInside = instance.element.contains(e.target);
                if (instance.isOpen && !clickedInside) {
                    instance.close();
                }
            });
        });

        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') {
                return;
            }

            CustomDropdown.instances.forEach(instance => {
                if (instance.isOpen) {
                    instance.close();
                    instance.trigger.focus();
                }
            });
        });

        CustomDropdown.globalListenersAttached = true;
    };

    function initCustomDropdowns(selector = '.js-custom-dropdown', options = {}) {
        const elements = document.querySelectorAll(selector);
        const instances = [];

        elements.forEach(el => {
            if (el._dropdownInstance) {
                instances.push(el._dropdownInstance);
                return;
            }

            const nativeSelect = el.querySelector('select');
            const nativeOptions = nativeSelect
                ? Array.from(nativeSelect.options).map(opt => ({
                    value: opt.value,
                    text: opt.textContent.trim()
                }))
                : null;
            const nativeValue = nativeSelect ? nativeSelect.value : null;

            const instance = new CustomDropdown(el, options);

            const optionsAttr = el.dataset.options;
            if (optionsAttr) {
                try {
                    instance.setOptions(JSON.parse(optionsAttr));
                } catch (e) {
                    console.error('Invalid data-options JSON:', optionsAttr, e);
                }
            }

            if (Object.prototype.hasOwnProperty.call(el.dataset, 'value')) {
                instance.setValue(el.dataset.value);
            }

            if (nativeOptions) {
                instance.setOptions(nativeOptions);
                instance.setValue(nativeValue);
            }

            instances.push(instance);
            el._dropdownInstance = instance;
        });

        return instances;
    }

    function getDropdownInstance(element) {
        if (typeof element === 'string') {
            element = document.getElementById(element);
        }

        return element && element._dropdownInstance ? element._dropdownInstance : null;
    }

    global.CustomDropdown = CustomDropdown;
    global.initCustomDropdowns = initCustomDropdowns;
    global.getDropdownInstance = getDropdownInstance;
})(typeof window !== 'undefined' ? window : this);

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initCustomDropdowns();
    });
} else {
    initCustomDropdowns();
}
