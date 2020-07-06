/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

const ModelManager = require('../../lib/modelmanager');
const ObjectValidator = require('../../lib/serializer/objectvalidator');
const TypedStack = require('../../lib/serializer/typedstack');
const Concerto = require('../../lib/concerto');
const chai = require('chai');
chai.should();
chai.use(require('chai-things'));

describe('ObjectValidator', function () {

    let modelManager;
    let concerto;
    let objectValidator;

    before(function () {
        modelManager = new ModelManager();
        modelManager.addModelFile(`namespace test

        concept Wheel {
            o String brand
        }

        participant Person identified by email {
            o String email
        }

        concept Manager identified {
            o String name
        }

        enum TestEnum {
            o ONE
            o TWO
            o THREE
        }

        concept Vehicle {
            o String color optional
            o Wheel[] wheels optional
            o String stringProperty optional
            o Integer integerProperty optional
            o Boolean booleanProperty optional
            o DateTime dateTimeProperty optional
            o String validatedStringProperty regex=/good/ optional
            o Person owner optional
            --> Person[] previousOwners optional
            o TestEnum[] testEnums optional
            --> Person lastOwner optional
        }
        `, 'test.cto');
    });

    beforeEach(function () {
        concerto = new Concerto(modelManager);
        objectValidator = new ObjectValidator(concerto);
    });

    afterEach(function () {
    });

    describe('#constructor', () => {
        it('should fail if concerto not supplied', () => {
            (function () {
                new ObjectValidator(null);
            }).should.throw(/Missing concerto instance/);
        });
    });
    describe('#checkEnum', () => {
        it('should fail if instance is not an array', () => {
            const data = {
                $class : 'test.Vehicle',
                testEnums : 'ONE'
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type TestEnum\[\]/);
        });

        it('should pass', () => {
            const data = {
                $class : 'test.Vehicle',
                color: 'red',
                wheels : [{
                    $class : 'test.Wheel',
                    brand : 'Michelin'
                }]
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
        });
    });

    describe('#checkItem', () => {
        it('should fail if property not a number', () => {
            const data = {
                $class : 'test.Vehicle',
                integerProperty: 'bad',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type Integer/);
        });

        it('should fail if property not a string', () => {
            const data = {
                $class : 'test.Vehicle',
                stringProperty: 1,
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type String/);
        });

        it('should fail if property type is symbol', () => {
            const data = {
                $class : 'test.Vehicle',
                stringProperty: Symbol('foo'),
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type String/);
        });

        it('should fail if property not a boolean', () => {
            const data = {
                $class : 'test.Vehicle',
                booleanProperty: 'false',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type Boolean/);
        });

        it('should fail if property not a DataTime', () => {
            const data = {
                $class : 'test.Vehicle',
                dateTimeProperty: true,
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected type DateTime/);
        });

        it('should fail if property fails field validator', () => {
            const data = {
                $class : 'test.Vehicle',
                validatedStringProperty: 'bad',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/failed to match validation regex: \/good\//);
        });

        it('should fail if complex property is not compatible', () => {
            const data = {
                $class : 'test.Vehicle',
                owner: {
                    $class: 'test.Wheel',
                    brand: 'Michelin'
                },
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/test.Wheel that is not derived from test.Person/);
        });

        it('should fail complex property that references a missing type', () => {
            const data = {
                $class : 'test.Vehicle',
                owner: {
                    $class: 'test.Missing',
                    brand: 'Michelin'
                },
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/Type Missing is not defined in namespace test/);
        });
    });

    describe('#visitRelationshipDeclaration', () => {
        it('should fail if property not an array of relationships', () => {
            const data = {
                $class : 'test.Vehicle',
                previousOwners: 'bad',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);

            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/Instance undefined has property previousOwners with type undefined that is not derived from test.Person\[\]/);
        });
    });

    describe('#visitRelationship', () => {
        it('should pass with instance if convertResourcesToRelationships is set', () => {
            const data = {
                $class : 'test.Vehicle',
                lastOwner: {
                    $class : 'test.Person',
                    email : 'test@example.com'
                },
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            objectValidator = new ObjectValidator(concerto, {permitResourcesForRelationships : true});
            objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
        });

        it('should fail with instance if convertResourcesToRelationships is not set', () => {
            const data = {
                $class : 'test.Vehicle',
                lastOwner: {
                    $class : 'test.Person',
                    email : 'test@example.com'
                },
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected a Relationship/);
        });

        it('should fail with non-identifiable instance if convertResourcesToRelationships is not set', () => {
            const data = {
                $class : 'test.Vehicle',
                lastOwner: {
                    $class : 'test.Wheel',
                    brand : 'test@example.com'
                },
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/expected a Relationship/);
        });

        it('should fail with a relationship to a non identifiable type', () => {
            const data = {
                $class : 'test.Vehicle',
                lastOwner: 'resource:test.Wheel#Michelin',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/Relationship can only be to identified types/);
        });

        it('should fail with a non assignable relationship', () => {
            const data = {
                $class : 'test.Vehicle',
                lastOwner: 'resource:test.Manager#Dan',
            };
            const parameters = {};
            parameters.stack = new TypedStack(data);
            (function () {
                objectValidator.visit(concerto.getTypeDeclaration(data), parameters);
            }).should.throw(/not derived from test.Person/);
        });


    });

});
