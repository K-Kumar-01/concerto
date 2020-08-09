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

/* eslint-disable no-console */
/* eslint-disable no-use-before-define */

const { configs } = require('triple-beam');
const colors = require('colors/safe');
const jsome = require('jsome');

jsome.params.lintable = true;

const timestamp = () => (new Date()).toLocaleTimeString();
const colorMap = configs.cli.colors;
const colorize = level => colors[colorMap[level]](level.toUpperCase());

/**
* Helper function to test if a string is a stringified version of a JSON object
* @param {string} str - the input string to test
* @returns {boolean} - true iff the string can be parsed as JSON
* @private
*/
const isJson = (str) => {
    try {
        return (JSON.parse(str) && !!str);
    } catch (e) {
        return false;
    }
};

/**
* Helper function to color and format JSON objects
* @param {any} obj - the input obj to prettify
* @returns {any} - the prettified object
* @private
*/
const prettifyJson = (obj) => {
    if(typeof obj === 'object') {
        return `\n${jsome.getColoredString(obj, null, 2)}`;
    } else if(isJson(obj)) {
        return `\n${jsome.getColoredString(JSON.parse(obj), null, 2)}`;
    }
    return obj;
};

const log = (level, ...args) => {
    let mutatedLevel = level;
    let data = args;
    let first = data.shift();

    // Flatten log object
    if(first && typeof first === 'object' && first.level && first.message){
        const padding = first.padding && first.padding[first.level];
        if (first.level === 'error' && first.stack) {
            mutatedLevel = 'error';
            first = `${first.message}\n${first.stack}`;
        } else if (['error', 'warn', 'info', 'debug'].includes(first.level)) {
            mutatedLevel = first.level;
            first = first.message;
        }
        first = padding ? `${padding} ${first}` : first;
    }

    data.unshift(first);

    const shim = ['error', 'warn'].includes(mutatedLevel) ? console.error : console.log;

    shim(
        `${timestamp()} - ${colorize(mutatedLevel)}:`,
        ...data
            .map(obj => obj instanceof Error ? `${obj.message}\n${obj.stack}`: obj)
            .map(prettifyJson)
    );
};

/**
 * A utility class with static function that print to the console
 */
class Logger {

    /**
     * Write a debug statement to the console.
     *
     * Prints to `stdout` with newline.
     * @param {any|object} data - if this is an object with properties `level` and `message` it will be flattened first
     * @param {any} args -
     * @returns {undefined} -
     */
    static debug(...args){ return log('debug', ...args); }

    /**
     * Write an info statement to the console.
     *
     * Prints to `stdout` with newline.
     * @param {any|object} data - if this is an object with properties `level` and `message` it will be flattened first
     * @param {any} args -
     * @returns {undefined} -
     */
    static info(...args){ return log('info', ...args); }

    /**
     * Write an info statement to the console. Alias for `logger.log`
     *
     * Prints to `stdout` with newline.
     * @param {any|object} data - if this is an object with properties `level` and `message` it will be flattened first
     * @param {any} args -
     * @returns {undefined} -
     */
    static log(...args){ return this.info(...args); }

    /**
     * Write an error statement to the console.
     *
     * Prints to `stderr` with newline.
     * @param {any|object} data - if this is an object with properties `level` and `message` it will be flattened first
     * @param {any} args -
     * @returns {undefined} -
     */
    static error(...args){ return log('error', ...args); }

    /**
     * Write an warning statement to the console.
     *
     * Prints to `stderr` with newline.
     * @param {any|object} data - if this is an object with properties `level` and `message` it will be flattened first
     * @param {any} args -
     * @returns {undefined} -
     */
    static warn(...args){ return log('warn', ...args); }
}

module.exports = Logger;
