/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { ActionTargetObjectType } from './ActionTargetObjectType';
import type { ActionType } from './ActionType';

export type ActionRead = {
    /**
     * Type of the Action
     */
    action_type: ActionType;
    /**
     * ID of the Target of the Action
     */
    target_id: number;
    /**
     * Type of the Target the target_id refers to
     */
    target_type: ActionTargetObjectType;
    /**
     * The before state of the target object in JSON.
     */
    before_state?: string;
    /**
     * The after state of the target object in JSON.
     */
    after_state?: string;
    /**
     * ID of the Action
     */
    id: number;
    /**
     * User the Action belongs to
     */
    user_id: number;
    /**
     * Project the Action belongs to
     */
    project_id: number;
    /**
     * Executed timestamp of the Action
     */
    executed: string;
};

