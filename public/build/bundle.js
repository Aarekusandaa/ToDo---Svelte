
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.42.4' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.42.4 */

    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[15] = list[i];
    	return child_ctx;
    }

    // (84:16) {#each todosInOption as todo}
    function create_each_block(ctx) {
    	let div;
    	let label;
    	let input;
    	let input_checked_value;
    	let t0;
    	let t1_value = /*todo*/ ctx[15].text + "";
    	let t1;
    	let t2;
    	let button;
    	let t4;
    	let mounted;
    	let dispose;

    	function click_handler_3() {
    		return /*click_handler_3*/ ctx[10](/*todo*/ ctx[15]);
    	}

    	function click_handler_4() {
    		return /*click_handler_4*/ ctx[11](/*todo*/ ctx[15]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			t1 = text(t1_value);
    			t2 = space();
    			button = element("button");
    			button.textContent = "Usuń";
    			t4 = space();
    			attr_dev(input, "type", "checkbox");
    			input.checked = input_checked_value = /*todo*/ ctx[15].done;
    			add_location(input, file, 86, 28, 2742);
    			add_location(label, file, 85, 24, 2706);
    			attr_dev(button, "class", "btn btn-secondary btn-lg svelte-akccjc");
    			attr_dev(button, "type", "button");
    			add_location(button, file, 89, 24, 2919);
    			attr_dev(div, "class", "checkbox svelte-akccjc");
    			add_location(div, file, 84, 20, 2659);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, label);
    			append_dev(label, input);
    			append_dev(label, t0);
    			append_dev(label, t1);
    			append_dev(div, t2);
    			append_dev(div, button);
    			append_dev(div, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "click", click_handler_3, false, false, false),
    					listen_dev(button, "click", click_handler_4, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (dirty & /*todosInOption*/ 4 && input_checked_value !== (input_checked_value = /*todo*/ ctx[15].done)) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*todosInOption*/ 4 && t1_value !== (t1_value = /*todo*/ ctx[15].text + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(84:16) {#each todosInOption as todo}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let div7;
    	let div0;
    	let h1;
    	let t0;
    	let span;
    	let t1_value = /*todos*/ ctx[1].length + "";
    	let t1;
    	let t2;
    	let div1;
    	let button0;
    	let t4;
    	let button1;
    	let t6;
    	let button2;
    	let t8;
    	let div3;
    	let div2;
    	let t9;
    	let div6;
    	let div5;
    	let div4;
    	let input;
    	let t10;
    	let button3;
    	let mounted;
    	let dispose;
    	let each_value = /*todosInOption*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			div7 = element("div");
    			div0 = element("div");
    			h1 = element("h1");
    			t0 = text("nodeTODO: ");
    			span = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "All";
    			t4 = space();
    			button1 = element("button");
    			button1.textContent = "To do";
    			t6 = space();
    			button2 = element("button");
    			button2.textContent = "Done";
    			t8 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t9 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div4 = element("div");
    			input = element("input");
    			t10 = space();
    			button3 = element("button");
    			button3.textContent = "Dodaj";
    			attr_dev(span, "class", "label label-info");
    			add_location(span, file, 72, 26, 2144);
    			add_location(h1, file, 72, 12, 2130);
    			attr_dev(div0, "class", "jumbotron text-center");
    			add_location(div0, file, 71, 8, 2082);
    			attr_dev(button0, "id", "btn1");
    			attr_dev(button0, "class", "svelte-akccjc");
    			add_location(button0, file, 76, 12, 2267);
    			attr_dev(button1, "id", "btn2");
    			attr_dev(button1, "class", "svelte-akccjc");
    			add_location(button1, file, 77, 12, 2342);
    			attr_dev(button2, "id", "btn3");
    			attr_dev(button2, "class", "svelte-akccjc");
    			add_location(button2, file, 78, 12, 2420);
    			attr_dev(div1, "id", "tabs");
    			attr_dev(div1, "class", "tabs svelte-akccjc");
    			add_location(div1, file, 75, 8, 2226);
    			attr_dev(div2, "class", "col-sm-8 col-sm-offset-2");
    			add_location(div2, file, 82, 12, 2554);
    			attr_dev(div3, "id", "todo-list");
    			attr_dev(div3, "class", "row svelte-akccjc");
    			add_location(div3, file, 81, 8, 2509);
    			attr_dev(input, "id", "newTodo");
    			attr_dev(input, "type", "text");
    			attr_dev(input, "class", "form-control input-lg text-center");
    			attr_dev(input, "placeholder", "co jeszcze chcesz zrobić?");
    			add_location(input, file, 98, 20, 3277);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file, 97, 16, 3232);
    			attr_dev(button3, "class", "btn btn-primary btn-lg");
    			add_location(button3, file, 101, 16, 3476);
    			attr_dev(div5, "class", "col-sm-8 col-sm-offset-2 text-center");
    			add_location(div5, file, 96, 12, 3165);
    			attr_dev(div6, "id", "todo-form");
    			attr_dev(div6, "class", "row svelte-akccjc");
    			add_location(div6, file, 95, 8, 3120);
    			attr_dev(div7, "class", "container");
    			add_location(div7, file, 69, 4, 2049);
    			add_location(main, file, 67, 0, 2037);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, div7);
    			append_dev(div7, div0);
    			append_dev(div0, h1);
    			append_dev(h1, t0);
    			append_dev(h1, span);
    			append_dev(span, t1);
    			append_dev(div7, t2);
    			append_dev(div7, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t4);
    			append_dev(div1, button1);
    			append_dev(div1, t6);
    			append_dev(div1, button2);
    			append_dev(div7, t8);
    			append_dev(div7, div3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			append_dev(div7, t9);
    			append_dev(div7, div6);
    			append_dev(div6, div5);
    			append_dev(div5, div4);
    			append_dev(div4, input);
    			set_input_value(input, /*text*/ ctx[0]);
    			append_dev(div5, t10);
    			append_dev(div5, button3);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[9], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[12]),
    					listen_dev(button3, "click", /*click_handler_5*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*todos*/ 2 && t1_value !== (t1_value = /*todos*/ ctx[1].length + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*deleteTodo, todosInOption, updateTodo*/ 28) {
    				each_value = /*todosInOption*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*text*/ 1 && input.value !== /*text*/ ctx[0]) {
    				set_input_value(input, /*text*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let text = '';
    	let todos = [];
    	let optionToShow = 'ALL';
    	let todosInOption = [];

    	fetch('http://localhost:4000/api/todos').then(response => response.json()).then(data => {
    		$$invalidate(1, todos = data);
    		showTodos(optionToShow);
    	});

    	function updateTodo(todo) {
    		todo.done = !todo.done;

    		const requestOptions = {
    			method: 'PATCH',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify(todo)
    		};

    		fetch('http://localhost:4000/api/todos', requestOptions).then(response => response.json()).then(data => {
    			$$invalidate(1, todos = data);
    			showTodos(optionToShow);
    		});
    	}

    	function deleteTodo(id) {
    		const requestOptions = { method: 'DELETE' };

    		fetch('http://localhost:4000/api/todos/' + id, requestOptions).then(response => response.json()).then(data => {
    			$$invalidate(1, todos = data);
    			showTodos(optionToShow);
    		});
    	}

    	function createTodo() {
    		const requestOptions = {
    			method: 'POST',
    			headers: { 'Content-Type': 'application/json' },
    			body: JSON.stringify({ text })
    		};

    		fetch('http://localhost:4000/api/todos/', requestOptions).then(response => response.json()).then(data => {
    			$$invalidate(0, text = '');
    			$$invalidate(1, todos = data);
    			showTodos(optionToShow);
    		});
    	}

    	function showTodos(option) {
    		if (todos.length === 0) {
    			$$invalidate(2, todosInOption = []);
    			return;
    		}

    		for (let todo of todos) {
    			if (option === 'ALL') {
    				$$invalidate(2, todosInOption = todos);
    			} else if (option === 'TODO') {
    				$$invalidate(2, todosInOption = todos.filter(todo => {
    					return !todo.done;
    				}));
    			} else if (option === 'DONE') {
    				$$invalidate(2, todosInOption = todos.filter(todo => {
    					return todo.done;
    				}));
    			}
    		}

    		optionToShow = option;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => showTodos('ALL');
    	const click_handler_1 = () => showTodos('TODO');
    	const click_handler_2 = () => showTodos('DONE');
    	const click_handler_3 = todo => updateTodo(todo);
    	const click_handler_4 = todo => deleteTodo(todo._id);

    	function input_input_handler() {
    		text = this.value;
    		$$invalidate(0, text);
    	}

    	const click_handler_5 = () => createTodo();

    	$$self.$capture_state = () => ({
    		text,
    		todos,
    		optionToShow,
    		todosInOption,
    		updateTodo,
    		deleteTodo,
    		createTodo,
    		showTodos
    	});

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    		if ('todos' in $$props) $$invalidate(1, todos = $$props.todos);
    		if ('optionToShow' in $$props) optionToShow = $$props.optionToShow;
    		if ('todosInOption' in $$props) $$invalidate(2, todosInOption = $$props.todosInOption);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		text,
    		todos,
    		todosInOption,
    		updateTodo,
    		deleteTodo,
    		createTodo,
    		showTodos,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		input_input_handler,
    		click_handler_5
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
