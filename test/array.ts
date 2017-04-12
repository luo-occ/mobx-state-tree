import {IObservableArray} from 'mobx'
import {onSnapshot, onPatch, onAction, applyPatch, applyPatches, applyAction, applyActions, getPath, IJsonPatch, applySnapshot, getSnapshot, types} from "../"
import {test} from "ava"

interface ITestSnapshot{
    to: string
}

interface ITest{
    to: string
}

const createTestFactories = () => {
    const ItemFactory = types.model({
            to: 'world'
        })

    const Factory = (types.array(
        ItemFactory
    ))

    return {Factory, ItemFactory}
}

// === FACTORY TESTS ===
test("it should create a factory", (t) => {
    const {Factory} = createTestFactories()

    const s = getSnapshot(Factory.create())

    t.deepEqual(getSnapshot(Factory.create()), [])
})

test("it should restore the state from the snapshot", (t) => {
    const {Factory} = createTestFactories()

    t.deepEqual(getSnapshot(Factory.create([{to: 'universe'}])), [{ to: 'universe' }])
})

// === SNAPSHOT TESTS ===
test("it should emit snapshots", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    let snapshots: any[] = []
    onSnapshot(doc, snapshot => snapshots.push(snapshot))

    doc.push(ItemFactory.create())

    t.deepEqual(snapshots, [[{to: 'world'}]])
})

test("it should apply snapshots", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    applySnapshot(doc, [{to: 'universe'}])

    t.deepEqual(getSnapshot(doc), [{to: 'universe'}])
})

test("it should return a snapshot", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    doc.push(ItemFactory.create())

    t.deepEqual(getSnapshot(doc), [{to: 'world'}])
})

// === PATCHES TESTS ===
test("it should emit add patches", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    let patches: any[] = []
    onPatch(doc, patch => patches.push(patch))

    doc.push(ItemFactory.create({to: "universe"}))

    t.deepEqual(patches, [
        {op: "add", path: "/0", value: {to: "universe"}}
    ])
})

test("it should apply a add patch", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    applyPatch(doc, {op: "add", path: "/0", value: {to: "universe"}})

    t.deepEqual(getSnapshot(doc), [{to: 'universe'}])
})

test("it should emit update patches", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    doc.push(ItemFactory.create())

    let patches: any[] = []
    onPatch(doc, patch => patches.push(patch))

    doc[0] = ItemFactory.create({to: "universe"})

    t.deepEqual(patches, [
        {op: "replace", path: "/0", value: {to: "universe"}}
    ])
})

test("it should apply a update patch", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    applyPatch(doc, {op: "replace", path: "/0", value: {to: "universe"}})

    t.deepEqual(getSnapshot(doc), [{to: 'universe'}])
})


test("it should emit remove patches", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    doc.push(ItemFactory.create())

    let patches: any[] = []
    onPatch(doc, patch => patches.push(patch))

    doc.splice(0)

    t.deepEqual(patches, [
        {op: "remove", path: "/0"}
    ])
})

test("it should apply a remove patch", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    doc.push(ItemFactory.create())
    doc.push(ItemFactory.create({to: "universe"}))

    applyPatch(doc, {op: "remove", path: "/0"})

    t.deepEqual(getSnapshot(doc), [{to: "universe"}])
})

test("it should apply patches", (t) => {
    const {Factory, ItemFactory} = createTestFactories()
    const doc = Factory.create()

    applyPatches(doc, [{op: "add", path: "/0", value: {to: "mars"}}, {op: "replace", path: "/0", value: {to: "universe"}}])

    t.deepEqual(getSnapshot(doc), [{to: 'universe'}])
})

// === TYPE CHECKS ===
test("it should check the type correctly", (t) => {
    const {Factory} = createTestFactories()

    const doc = Factory.create()

    t.deepEqual(Factory.is(doc), true)
    t.deepEqual(Factory.is([]), true)
    t.deepEqual(Factory.is({}), false)
    t.deepEqual(Factory.is([{to: 'mars'}]), true)
    t.deepEqual(Factory.is([{wrongKey: true}]), true)
    t.deepEqual(Factory.is([{to: true}]), false)
})

test("paths shoud remain correct when splicing", t => {
    const store = types.model({
        todos: types.array(types.model("Task", {
            done: false
        }))
    }).create({
        todos: [{}]
    })

    t.deepEqual(store.todos.map(getPath), ["/todos/0"])

    store.todos.push({} as any)
    t.deepEqual(store.todos.map(getPath), ["/todos/0", "/todos/1"])

    store.todos.unshift({} as any)
    t.deepEqual(store.todos.map(getPath), ["/todos/0", "/todos/1", "/todos/2"])

    store.todos.splice(0, 2)
    t.deepEqual(store.todos.map(getPath), ["/todos/0"])

    store.todos.splice(0, 1, {} as any, {} as any, {} as any)
    t.deepEqual(store.todos.map(getPath), ["/todos/0", "/todos/1", "/todos/2"])
})

test("items should be reconciled correctly when splicing - 1", t => {
    const Task = types.model("Task", {
        x: types.string
    })
    const
        a = Task.create({ x: "a" }),
        b = Task.create({ x: "b" }),
        c = Task.create({ x: "c" }),
        d = Task.create({ x: "d" })
    ;

    const store = types.model({
        todos: types.array(Task)
    }).create({
        todos: [a]
    })

    t.deepEqual(store.todos.slice(), [a])

    store.todos.push(b)
    t.deepEqual(store.todos.slice(), [a, b])

    store.todos.unshift(c)
    t.deepEqual(store.todos.slice(), [c, a, b])

    store.todos.splice(0, 2)
    t.deepEqual(store.todos.slice(), [b])

    store.todos.splice(0, 1, a, c, d)
    t.deepEqual(store.todos.slice(), [a, c, d])
})

test("items should be reconciled correctly when splicing - 2", t => {
    const Task = types.model("Task", {
        x: types.string
    })
    const
        a = Task.create({ x: "a" }),
        b = Task.create({ x: "b" }),
        c = Task.create({ x: "c" }),
        d = Task.create({ x: "d" })
    ;

    const store = types.model({
        todos: types.array(Task)
    }).create({
        todos: [a, b, c, d]
    })

    store.todos.splice(2, 1, { x: "e" }, { x: "f"})
    // becomes, a, b, e, f, d
    t.is(store.todos.length, 5)
    t.true(store.todos[0] === a)
    t.true(store.todos[1] === b)
    t.true(store.todos[2] === c) // reconciled
    t.is(store.todos[2].x, "e")
    t.true(store.todos[3] !== d) // not reconciled
    t.is(store.todos[3].x, "f")
    t.true(store.todos[4] === d) // preserved and moved
    t.is(store.todos[4].x, "d")

    t.deepEqual(store.todos.map(getPath), [
        "/todos/0",
        "/todos/1",
        "/todos/2",
        "/todos/3",
        "/todos/4"
    ])

    store.todos.splice(1, 3, { x: "g"})
    // becomes a, g, d
    t.is(store.todos.length, 3)
    t.true(store.todos[0] === a)
    t.is(store.todos[1].x, "g")
    t.is(store.todos[2].x, "d")
    t.true(store.todos[1] === b) // still reconciled
    t.true(store.todos[2] === d) // still original d

    t.deepEqual(store.todos.map(getPath), [
        "/todos/0",
        "/todos/1",
        "/todos/2"
    ])
})

test("it should reconciliate keyed instances correctly", (t) => {
    const Store = types.model({
        todos: types.array(types.model("Task", {
            id: types.identifier(),
            task: "",
            done: false
        }))
    })

    const store = Store.create({
        todos: [
            { id: "1", task: "coffee", done: false},
            { id: "2", task: "tea", done: false},
            { id: "3", task: "biscuit", done: false}
        ]
    })

    t.deepEqual(store.todos.map(todo => todo.task), ["coffee", "tea", "biscuit"])
    t.deepEqual(store.todos.map(todo => todo.done), [false, false, false])
    t.deepEqual(store.todos.map(todo => todo.id), ["1", "2", "3"])

    const a = store.todos[0]
    const b = store.todos[1]
    const c = store.todos[2]

    applySnapshot(store, {
        todos: [
            { id: "2", task: "Tee", done: true},
            { id: "1", task: "coffee", done: true},
            { id: "4", task: "biscuit", done: false},
            { id: "5", task: "stuffz", done: false}
        ]
    })

    t.deepEqual(store.todos.map(todo => todo.task), ["Tee", "coffee", "biscuit", "stuffz"])
    t.deepEqual(store.todos.map(todo => todo.done), [true, true, false, false])
    t.deepEqual(store.todos.map(todo => todo.id), ["2", "1", "4", "5"])

    t.is(store.todos[0] === b, true)
    t.is(store.todos[1] === a, true)
    t.is(store.todos[2] === c, false)
})

// TODO: in future, support identifier in unions etc
// test("it should reconciliate instances correctly", (t) => {
//     const Store = types.model.create({
//         todos: types.array(types.union(
//             types.model.create("completedTask", {
//                 id: types.identifier(),
//                 task: "",
//                 done: types.literal(true)
//             }),
//             types.model.create("uncompletedTask", {
//                 id: types.identifier()
//                 task: "",
//                 done: types.literal(true)
//             })
//         ))
//     })
// })