import { Position, TextDocument, Range } from "vscode";
import { ENTITIES } from "./entities";

const _DEF_DECIMAL = `[0-9]+`,
    _DEF_HEX = `[0-9a-fA-F]+`;

const _PATTERN_HEX = `&#[xX]${_DEF_HEX};`,
    _PATTERN_UNICODE = `\\\\u${_DEF_HEX}`,
    _PATTERN_DECIMAL = `&#${_DEF_DECIMAL};`,
    _PATTERN_NAME = `&[a-zA-Z]+[0-9]*;`;

export const POSITION_ZERO = new Position(0, 0);
export const RANGE_ZERO = new Range(POSITION_ZERO, POSITION_ZERO);
export const PATTERNS = {
    ANY: `(${_PATTERN_HEX}|${_PATTERN_UNICODE}|${_PATTERN_DECIMAL}){1,2}|${_PATTERN_NAME}`,
    HEX: `(${_PATTERN_HEX}){1,2}`,
    UNICODE: `(${_PATTERN_UNICODE}){1,2}`,
    DECIMAL: `(${_PATTERN_DECIMAL}){1,2}`,
    HEX_OR_UNICODE: `(${_PATTERN_HEX}){1,2}|(${_PATTERN_UNICODE}){1,2}`,
    NAME: _PATTERN_NAME,
}

export enum EntityType {
    //'&#x#####'
    HEX = 0,
    //'&#####'
    DECIMALS,
    // ''
    GLYPH,
    // '&name;'
    NAME,
    // '\u0090'
    UNICODE
}

export namespace EntityType {
    export function fromType(val: string) : EntityType | undefined {
        switch (val.toLowerCase()) {
            case 'hex':
                return EntityType.HEX;
            case 'decimals':
                return EntityType.DECIMALS;
            case 'glyph':
                return EntityType.GLYPH;
            case 'name':
                return EntityType.NAME;
            case 'unicode':
                return EntityType.UNICODE;
            default:
                return;
        }
    }
    export function values() {
        return ['hex', 'decimals', 'glyph', 'name', 'unicode'];
    }
}

export type Entity = {
    hex: string[],
    entity: string,
    decimals: number[],
    name: string,
    unicode: string,
    glyph: string
}

export type FindResult = {
    identifier: string,
    ranges: Range[],
    entity: any
}

function _identify(value: string) {
    if (value.startsWith('&#')) {
        return value.toLowerCase().startsWith('&#x') ? EntityType.HEX : EntityType.DECIMALS;
    }
    else if (value.startsWith('&')) {
        return EntityType.NAME;
    }

    return EntityType.UNICODE;
}

function _splitEntitiesInString(string: string): { value: string, casted: string | number, type: EntityType }[] {
    const parts: { value: string, casted: string | number, type: EntityType }[] = [];

    // hex or decimal
    if (string.startsWith('&#')) {
        string.split('&#').filter(i => i).forEach(i => {
            const value = `&#${i}`;
            let casted : string | number = i.substring(0, i.length - 1);
            const type = _identify(value);

            if (type === EntityType.DECIMALS) {
                casted = +casted;
            } else if (type === EntityType.HEX) {
                casted = casted.substring(1);
            }

            parts.push({ value, casted, type, })
        });
    }
    // name
    else if (string.startsWith('&')) {
        parts.push({
            value: string,
            casted: string.substring(1, string.length - 1),
            type: EntityType.NAME
        })
    }
    // unicode
    else if (string.startsWith('\\u')) {
        string.split('\\u').filter(i => i).forEach(i =>
            parts.push({
                value: '\\u' + i,
                casted: i,
                type: EntityType.UNICODE
            })
        );
    }

    return parts;
}

function _resolveEntityForText(string: string) {
    const parts = _splitEntitiesInString(string);
    if (parts.length === 1 && parts[0].type === EntityType.NAME) {
        return {
            identifier: parts[0].value,
            entity: ENTITIES.find(e => e.entity === parts[0].value)
        }
    }
    else if (parts.length > 0) {
        let property: string = EntityType.values()[parts[0].type.valueOf()].toLowerCase();
        if (parts[0].type === EntityType.UNICODE)
            property = 'hex';

        while (parts.length > 0) {
            const partsCasted = parts.map(p => p.casted);
            const entity = ENTITIES.find(e => {
                // @ts-ignore
                const p = e[property];
                if (p.length !== partsCasted.length) return false;
                return p.every((j: any, index: number) => {
                        return j === partsCasted[index];
                    });
            });

            if (entity) {
                return {
                    identifier: parts.map(p => p.value).join(''),
                    entity
                }
            } else { parts.pop() }
        }
    }
}

export function getEntityAtPosition(document: TextDocument, position: Position): FindResult | undefined {
    const wordRange = document.getWordRangeAtPosition(position, new RegExp(PATTERNS.ANY));
    if (!wordRange) return;
    const text = document.getText(wordRange);
    const match = _resolveEntityForText(text);
    if (match) {
        return {
            ...match,
            ranges: [new Range(wordRange.start, new Position(wordRange.end.line, wordRange.start.character + match.identifier.length))]
        }
    }
}

export function findAllEntitiesInRange(document: TextDocument, range: Range | undefined = undefined): FindResult[] {
    const startOffset = range ? document.offsetAt(range.start) : 0;
    const text = document.getText(range);
    const entities: { [key_: string]: FindResult } = {};

    const matches = text.matchAll(new RegExp(PATTERNS.ANY, 'g'));
    for (const i of matches) {
        const rng = new Range(document.positionAt(i.index + startOffset), document.positionAt(i.index + i[0].length + startOffset));
        if (!entities[i[0]]) {
            const match = _resolveEntityForText(i[0]);
            if (match) {
                const matchRng = new Range(rng.start, new Position(rng.end.line, rng.start.character + match.identifier.length));
                entities[i[0]] = {
                    ...match,
                    ranges: [matchRng],
                }

                if (!matchRng.isEqual(rng)) {
                    const additionals = findAllEntitiesInRange(document, new Range(matchRng.end, rng.end));
                    for (const j of additionals) {
                        if (!entities[j.identifier]) {
                            entities[j.identifier] = j;
                        }
                        else { entities[j.identifier].ranges.push(...j.ranges) }
                    }
                }
            }
        }
        else {
            entities[i[0]].ranges.push(rng)
        }
    }

    return Object.values(entities);
}

export function formatEntityOutput(entity: Entity, toType: EntityType): string {
    switch (toType) {
        case EntityType.HEX:
            return entity.hex.map(i => `&#x${i};`).join('');
        case EntityType.UNICODE:
            return entity.hex.map(i => '\\u' + i).join('');
        case EntityType.DECIMALS:
            return entity.decimals.map(i => `&#${i};`).join('');
        case EntityType.NAME:
            return entity.entity;
        case EntityType.GLYPH:
            return entity.unicode;
    }
}