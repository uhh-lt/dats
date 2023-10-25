/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

/**
 * Helper class that provides a standard way to create an ABC using
 * inheritance.
 */
export type IdIsOneOf = {
  discriminator: IdIsOneOf.discriminator;
  value: Array<number>;
};

export namespace IdIsOneOf {
  export enum discriminator {
    ID_IS_ONE_OF = "id_is_one_of",
  }
}
