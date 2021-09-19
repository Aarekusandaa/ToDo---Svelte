<script>
    let text = '';
    let todos = [];
    let optionToShow = 'ALL';
    let todosInOption = [];
    

    fetch('http://localhost:4000/api/todos').then(response => response.json()).then(data => {
            todos = data;
            showTodos(optionToShow);
        });

    function createTodo() {
        const requestOptions = {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({text: text})
        }
        fetch('http://localhost:4000/api/todos/', requestOptions).then(response => response.json()).then(data => {
                text = '';
                todos = data;
                showTodos(optionToShow);
            });
    }
    
    function deleteTodo(id) {
        const requestOptions = {
            method: 'DELETE'
        }
        fetch('http://localhost:4000/api/todos/' + id, requestOptions).then(response => response.json()).then(data => {
                todos = data;
                showTodos(optionToShow);
            });
    }

    function updateTodo(todo) {
        todo.done = !todo.done;
        const requestOptions = {
            method: 'PATCH',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(todo)
        };
        fetch('http://localhost:4000/api/todos', requestOptions).then(response => response.json()).then(data => {
                todos = data;
                showTodos(optionToShow);
            });
    }

    function showTodos(option) {
        if (todos.length === 0) {
            todosInOption = [];
            return;
        }
        for (let todo of todos){
            if (option === 'ALL') {
                todosInOption = todos;
            } else if (option === 'TODO') {
                todosInOption = todos.filter((todo) => { return !todo.done });
            } else if (option === 'DONE') {
                todosInOption = todos.filter((todo) => { return todo.done });
            }
        }
        optionToShow = option;
    }

</script>

<main>

    <div class="container">

        <div class="jumbotron text-center">
            <h1>nodeTODO: <span class="label label-info">{todos.length}</span></h1>
        </div>

        <div id="tabs" class="tabs">
            <button id=btn1 on:click={() => showTodos('ALL')}>All</button>
            <button id=btn2 on:click={() => showTodos('TODO')}>To do</button>
            <button id=btn3 on:click={() => showTodos('DONE')}>Done</button>
        </div>

        <div id="todo-list" class="row">
            <div class="col-sm-8 col-sm-offset-2">
                {#each todosInOption as todo}
                    <div class="checkbox">
                        <label>
                            <input type="checkbox" on:click={() => updateTodo(todo)} checked={todo.done}>
                            { todo.text }
                        </label>
                        <button class="btn btn-secondary btn-lg" type="button" on:click={() => deleteTodo(todo._id)}>Usuń</button>
                    </div>
                {/each}
            </div>
        </div>

        <div id="todo-form" class="row">
            <div class="col-sm-8 col-sm-offset-2 text-center">
                <div class="form-group">
                    <input id="newTodo" type="text" class="form-control input-lg text-center"
                           placeholder="co jeszcze chcesz zrobić?" bind:value={text}>
                </div>
                <button class="btn btn-primary btn-lg" on:click={() => createTodo()}>Dodaj</button>
            </div>
        </div>
    </div>

</main>

<style>
    @import "//netdna.bootstrapcdn.com/bootstrap/3.0.0/css/bootstrap.min.css";

    html {
            overflow-y: scroll;
        }

        body {
            padding-top: 50px;
        }

        #todo-list {
            margin-bottom: 30px;
        }

        #todo-form {
            margin-bottom: 50px;
        }

        .checkbox {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border: 1px solid #c7cdc7;
            padding: 10px 50px;
        }

        .checkbox button {
            font-size: 16px;
        }

        .tabs {
            display: flex;
            justify-content: center;
        }

        .tabs button {
            padding: 20px;
            background-color:cornsilk;
        }
</style>
