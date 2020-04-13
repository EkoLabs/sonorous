/**
 * Copies a property from an instance onto an object. The object's get/set functions will
 * essentially hook into the instance's get/set functions. This means that manipulating the
 * property on the object will manipulate it on the instance.
 *
 * @param {*} instance - instance to copy the getter/setter from
 * @param {*} object - object to copy the getter/setter to
 * @param {*} propertyName - property name to copy over
 * @param {*} readOnly - should it be read only or not?
 */
function copyGetterSetterFromInstance(instance, object, propertyName, readOnly) {
    Object.defineProperty(object, propertyName, {
        get: function() {
            return instance[propertyName];
        },

        // If we don't want a setter, pass undefined so it won't be settable
        set: readOnly ?
            undefined :
            function(newValue) {
                instance[propertyName] = newValue;
            },
        enumerable: true // Must be enumerable so that extend() catches it
    });
}

export default copyGetterSetterFromInstance;
