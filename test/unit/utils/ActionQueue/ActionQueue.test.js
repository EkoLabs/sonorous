import ActionQueue from '../../../../src/utils/ActionQueue/ActionQueue';

describe('ActionQueue', () => {
    it('creates distinct action queues', () => {
        let e1 = new ActionQueue();
        let e2 = new ActionQueue();
        expect(e1).not.toBe(e2);
    });
    describe('basic validation', () => {
        it('will throw an error if there is no action', () => {
            let aq = new ActionQueue();
            expect(() => aq.push({})).toThrow('Action must have an onExecute function');
        });
        it('will throw an error if the action is not a function', () => {
            let aq = new ActionQueue();
            expect(() => aq.push({ onExecute: 1234 })).toThrow('onExecute must be a function');
        });
        it('will throw an error if there is no name', () => {
            let aq = new ActionQueue();
            expect(() => aq.push({ onExecute: jest.fn() })).toThrow('action must have a name');
        });
        it('will throw an error if name is not a string', () => {
            let aq = new ActionQueue();
            expect(() => aq.push({ name: 1234, onExecute: jest.fn() })).toThrow('action name must be a string');
        });
        it('will throw an error if args is not an array', () => {
            let aq = new ActionQueue();
            expect(() => aq.push({ name: 'test', onExecute: jest.fn(), args: 123 })).toThrow('Args must be in an array');
        });
        it('has an accurate size property', () => {
            let aq = new ActionQueue();
            for (let i = 0; i < 10; i++) {
                aq.push({
                    name: `action_${i}`,
                    onExecute: jest.fn()
                });
            }
            expect(aq.size).toBe(10);
        });
        it('has an accurate isEmpty property', () => {
            let aq = new ActionQueue();
            expect(aq.isEmpty).toBe(true);
            aq.push({ name: 'action', onExecute: jest.fn() });
            expect(aq.isEmpty).toBe(false);
        });
    });
    describe('queues actions while waiting for start', () => {
        it('builds a queue of actions before start is called', () => {
            let aq = new ActionQueue();
            for (let i = 0; i < 4; i++) {
                aq.push({
                    name: `action${i}`,
                    onExecute: jest.fn()
                });
            }
            expect(aq.size).toBe(4);
        });
        it('will not execute actions after stop is called', () => {
            let mockFxn = jest.fn();
            let aq = new ActionQueue();
            aq.start();
            aq.stop();
            aq.push({
                name: 'action1',
                onExecute: mockFxn
            });
            expect(mockFxn.mock.calls.length).toBe(0);
            expect(aq.size).toBe(1);
        });
    });
    describe('executes actions after start', () => {
        it('executes all actions in the queue after start is called', () => {
            let mockFxn = jest.fn();
            let aq = new ActionQueue();
            for (let i = 0; i < 4; i++) {
                aq.push({
                    name: `actions${i}`,
                    onExecute: mockFxn
                });
            }
            expect(aq.size).toBe(4);
            aq.start();
            expect(mockFxn.mock.calls.length).toBe(4);
        });
        it('will call the actions in the queue with the right arguments', () => {
            let mockFxn = jest.fn((x) => x + 1);
            let aq = new ActionQueue();
            for (let i = 0; i < 4; i++) {
                aq.push({
                    name: `actions${i}`,
                    onExecute: mockFxn,
                    args: [i]
                });
            }
            expect(aq.size).toBe(4);
            aq.start();
            expect(mockFxn.mock.calls.length).toBe(4);
            expect(mockFxn.mock.calls[0][0]).toBe(0);
            expect(mockFxn.mock.calls[1][0]).toBe(1);
            expect(mockFxn.mock.calls[2][0]).toBe(2);
            // eslint-disable-next-line no-magic-numbers
            expect(mockFxn.mock.calls[3][0]).toBe(3);
        });
        it('will call the actions in the queue with the right multiple arguments', () => {
            let mockFxn = jest.fn((x, y) => x + y);
            let aq = new ActionQueue();
            for (let i = 0; i < 4; i++) {
                aq.push({
                    name: `actions${i}`,
                    onExecute: mockFxn,
                    args: [i, i + 1]
                });
            }
            expect(aq.size).toBe(4);
            aq.start();
            expect(mockFxn.mock.calls.length).toBe(4);

            expect(mockFxn.mock.calls[0][0]).toBe(0);
            expect(mockFxn.mock.calls[0][1]).toBe(1);

            expect(mockFxn.mock.calls[1][0]).toBe(1);
            expect(mockFxn.mock.calls[1][1]).toBe(2);

            expect(mockFxn.mock.calls[2][0]).toBe(2);
            // eslint-disable-next-line no-magic-numbers
            expect(mockFxn.mock.calls[2][1]).toBe(3);

            // eslint-disable-next-line no-magic-numbers
            expect(mockFxn.mock.calls[3][0]).toBe(3);
            // eslint-disable-next-line no-magic-numbers
            expect(mockFxn.mock.calls[3][1]).toBe(4);
        });
        it('will execute a function immediately after start is called', () => {
            let mockFxn = jest.fn();
            let aq =  new ActionQueue();
            aq.start();
            aq.push({
                name: 'action1',
                onExecute: mockFxn
            });
            expect(mockFxn.mock.calls.length).toBe(1);
        });
        it('will throw an error if pop is called with no actions', () => {
            let aq = new ActionQueue();
            aq.start();
            expect(() => aq.pop()).toThrow('Attempt to pop with no actions in queue');
        });
    });

    describe('clear functionality', () => {
        it('does clear the queue and will not execute actions if indicated', () => {
            let mockFxn = jest.fn();
            let aq = new ActionQueue();
            aq.push({
                name: 'action1',
                onExecute: mockFxn
            });
            aq.clear();
            expect(mockFxn.mock.calls.length).toBe(0);
            expect(aq.size).toBe(0);
        });
        it('does clear the queue and will not execute actions if stopped', () => {
            let mockFxn = jest.fn();
            let aq = new ActionQueue();
            aq.push({
                name: 'action1',
                onExecute: mockFxn
            });
            aq.clear();
            expect(mockFxn.mock.calls.length).toBe(0);
            expect(aq.size).toBe(0);
        });
    });
    describe('intense testing', () => {
        const mockFn = jest.fn();
        it('can handle pushing and popping many actions', () => {
            let aq = new ActionQueue();
            for (let i = 0; i < 100; i++) {
                aq.push({
                    name: `action_${i}`,
                    onExecute: mockFn
                });
                expect(aq.size).toBe(i + 1);
            }
            expect(aq.size).toBe(100);
            for (let i = 0; i < 100; i++) {
                expect(aq._queue.filter((e) => e.name === `action_${i}`).length).toBe(1);
            }
            aq.start();
            expect(mockFn.mock.calls.length).toBe(100);
            for (let i = 0; i < 100; i++) {
                expect(aq._queue.filter((e) => e.name === `action_${i}`).length).toBe(0);
            }
            for (let i = 0; i < 100; i++) {
                aq.push({
                    name: `action_${i}`,
                    onExecute: mockFn
                });
                expect(aq.size).toBe(0);
            }
            expect(mockFn.mock.calls.length).toBe(200); // eslint-disable-line no-magic-numbers
        });
        it('will retain actions after stopping and execute them after start', () => {
            let aq = new ActionQueue();
            for (let i = 0; i < 100; i++) {
                aq.push({
                    name: `action_${i}`,
                    onExecute: mockFn
                });
                expect(aq.size).toBe(i + 1);
            }
            expect(aq.size).toBe(100);
            for (let i = 0; i < 100; i++) {
                expect(aq._queue.filter((e) => e.name === `action_${i}`).length).toBe(1);
            }
            aq.start();
            expect(mockFn.mock.calls.length).toBe(100);
            for (let i = 0; i < 100; i++) {
                expect(aq._queue.filter((e) => e.name === `action_${i}`).length).toBe(0);
            }
            aq.stop();
            for (let i = 100; i < 200; i++) { // eslint-disable-line no-magic-numbers
                aq.push({
                    name: `action_${i}`,
                    onExecute: mockFn
                });
                expect(aq.size).toBe((i - 100) + 1);
            }
            expect(aq.size).toBe(100);
            for (let i = 100; i < 200; i++) { // eslint-disable-line no-magic-numbers
                expect(aq._queue.filter((e) => e.name === `action_${i}`).length).toBe(1);
            }
            aq.start();
            expect(mockFn.mock.calls.length).toBe(200); // eslint-disable-line no-magic-numbers
        });
    });
});
