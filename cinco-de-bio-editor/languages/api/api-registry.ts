/********************************************************************************
 * Copyright (c) 2022 Cinco Cloud.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import * as cincodebio from './cincodebio';
import * as siblibrary from './siblibrary';

export class APIRegistry {
    private static classes: [string, any][] = [
        ['cincodebio:sibvalue', cincodebio.SibValue],
        ['cincodebio:controlflow', cincodebio.ControlFlow],
        ['cincodebio:dataflow', cincodebio.DataFlow],
        ['cincodebio:cincodebiographmodel', cincodebio.CincoDeBioGraphModel],
        ['cincodebio:siblabel', cincodebio.SIBLabel],
        ['cincodebio:sib', cincodebio.SIB],
        ['cincodebio:io', cincodebio.IO],
        ['cincodebio:stringvalue', cincodebio.StringValue],
        ['cincodebio:enumvalue', cincodebio.EnumValue],
        ['cincodebio:integervalue', cincodebio.IntegerValue],
        ['cincodebio:colorvalue', cincodebio.ColorValue],
        ['cincodebio:automatedsib', cincodebio.AutomatedSIB],
        ['cincodebio:interactivesib', cincodebio.InteractiveSIB],
        ['cincodebio:inputport', cincodebio.InputPort],
        ['cincodebio:outputport', cincodebio.OutputPort],
        ['siblibrary:siblibrary', siblibrary.SIBLibrary],
        ['siblibrary:label', siblibrary.Label],
        ['siblibrary:branch', siblibrary.Branch],
        ['siblibrary:sibdef', siblibrary.SIBDef],
        ['siblibrary:iodef', siblibrary.IODef],
        ['siblibrary:service', siblibrary.Service],
        ['siblibrary:task', siblibrary.Task],
        ['siblibrary:input', siblibrary.Input],
        ['siblibrary:output', siblibrary.Output]
    ];
    static classMap: Map<string, any> = new Map(APIRegistry.classes);
}

LanguageFilesRegistry.register(APIRegistry);
