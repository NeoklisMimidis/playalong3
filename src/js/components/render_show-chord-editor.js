export const showChordEditorHTMLWithCategories = `
<div
class="modal"
id="show-chord-editor"
tabindex="-1"
aria-labelledby="showCordEditorLabel"
aria-hidden="true"
>
<div class="modal-body">
  <div class="container">
    <div id="chord-editor">
      <div class="row justify-content-around my-5">
        <table id="roots" class="table table-bordered table-dark col-4">
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="7">Roots</th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <td data-modal-tooltip="La" class="root">A</td>
              <td data-modal-tooltip="Si" class="root">B</td>
              <td data-modal-tooltip="Do" class="root">C</td>
              <td data-modal-tooltip="Re" class="root">D</td>
              <td data-modal-tooltip="Mi" class="root">E</td>
              <td data-modal-tooltip="Fa" class="root">F</td>
              <td data-modal-tooltip="Sol" class="root">G</td>
            </tr>
          </tbody>
        </table>
        <table
          id="others"
          class="table table-bordered table-dark col-2"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="2">
                Others
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <!-- prettier-ignore -->
              <td class="variation" id="special-characters">
          <text id="disable-font-label">N.C.</text>
        </td>
              <td class="variation" id="special-characters">
                <text id="disable-font-label">??</text>
              </td>
            </tr>
          </tbody>
        </table>
        <table
          id="accidentals"
          class="table table-bordered table-dark col-2"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="3">
                Accidentals
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <td data-modal-tooltip="Sharp" class="accidental">+</td>
              <td data-modal-tooltip="Natural" class="accidental"></td>
              <!-- prettier-ignore -->
              <td data-modal-tooltip="Flat" class="accidental">&</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="row justify-content-center">
        <table
          id="variations"
          class="col-8 table table-bordered table-dark"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="17">
                Variations
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <th scope="col" class="text-center small p-1" colspan="3">
                Major
              </th>
              <th scope="col" class="text-center small p-1" colspan="7">
                Minor
              </th>
              <th scope="col" class="text-center small p-1" colspan="6">
                Augmented, Diminished & Half Dim.
              </th>
            </tr>
            <tr>
              <!-- prettier-ignore -->
              <td class="variation">c</td>
              <td class="variation">d</td>
              <td class="variation">e</td>

              <td class="variation">a</td>
              <td class="variation">b</td>
              <td class="variation">f</td>
              <td class="variation">h</td>
              <td class="variation">g</td>
              <td class="variation">i</td>
              <td class="variation">3</td>

              <td class="variation">@</td>

              <td class="variation">&gt;</td>
              <td class="variation">8</td>
              <td class="variation">W</td>
              <td class="variation">X</td>
              <td class="variation">Y</td>
            </tr>

            <tr>
              <th scope="col" class="text-center small p-1" colspan="1">
                Fifth
              </th>

              <th scope="col" class="text-center small p-1" colspan="4">
                Dominant
              </th>

              <th scope="col" class="text-center small p-1" colspan="7">
                Add chords
              </th>

              <th scope="col" class="text-center small p-1" colspan="4">
                Suspended
              </th>
            </tr>
            <tr>
              <td class="variation">5</td>

              <td class="variation">7</td>
              <td class="variation">9</td>
              <td class="variation">Q</td>
              <td class="variation">U</td>

              <td class="variation">6</td>
              <td class="variation">k</td>
              <td class="variation">=</td>

              <td class="variation">j</td>
              <td class="variation">R</td>
              <td class="variation">Z</td>
              <td class="variation">%</td>

              <td class="variation">
                4<text id="disable-font-label">2</text>
              </td>
              <td class="variation">
                4<text id="disable-font-label">4</text>
              </td>
              <td class="variation">H</td>
              <td class="variation">[</td>
            </tr>
            <tr></tr>

            <tr></tr>

            <tr>
              <th scope="col" class="text-center small p-1" colspan="2">
                .. Sus.
              </th>

              <th scope="col" class="text-center small p-1" colspan="7">
                Altered Chords
              </th>

              <th scope="col" class="text-center small p-1" colspan="7">
                Dominant Altered Chords
              </th>
            </tr>
            <tr>
              <td class="variation">]</td>
              <td class="variation">&lt;</td>

              <td class="variation">V</td>
              <td class="variation">v</td>
              <td class="variation">w</td>

              <td class="variation">1</td>
              <td class="variation">z</td>
              <td class="variation">x</td>
              <td class="variation">y</td>

              <td class="variation">T</td>
              <td class="variation">n</td>
              <td class="variation">r</td>
              <td class="variation">2</td>
              <td class="variation">u</td>
              <td class="variation">o</td>
              <td class="variation">l</td>
            </tr>
            <tr>
              <th
                scope="col"
                class="text-center small p-1"
                colspan="16"
              >
                Dominant Altered Sevenths Chords
              </th>
            </tr>
            <tr>
              <td class="variation">?</td>
              <td class="variation">p</td>
              <td class="variation">q</td>
              <td class="variation">L</td>
              <td class="variation">J</td>
              <td class="variation">O</td>
              <td class="variation">M</td>
              <td class="variation">S</td>
              <td class="variation">s</td>
              <td class="variation">K</td>

              <td class="variation">P</td>
              <td class="variation">N</td>
              <td class="variation">t</td>

              <td class="variation">I</td>
              <td class="variation">0</td>
              <td class="variation">m</td>
            </tr>
            <tr></tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-end" style="
      padding-right: 150px;" >
        <button
          id="cancel-btn"
          class="btn btn-light btn-lg mx-3"
          data-dismiss="modal"
        >
          Cancel
        </button>
        <button
          id="apply-btn"
          class="btn btn-primary btn-lg"
          data-dismiss="modal"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal-content bg-transparent border-0"></div>
</div>`;

// -

export const showChordEditorHTMLWithoutCategories = `
<div
class="modal"
id="show-chord-editor"
tabindex="-1"
aria-labelledby="showCordEditorLabel"
aria-hidden="true"
>
<div class="modal-body">
  <div class="container">
    <div id="chord-editor">
      <div class="row justify-content-around my-5">
        <table id="roots" class="table table-bordered table-dark col-4">
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="7">Roots</th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <td data-modal-tooltip="La" class="root">A</td>
              <td data-modal-tooltip="Si" class="root">B</td>
              <td data-modal-tooltip="Do" class="root">C</td>
              <td data-modal-tooltip="Re" class="root">D</td>
              <td data-modal-tooltip="Mi" class="root">E</td>
              <td data-modal-tooltip="Fa" class="root">F</td>
              <td data-modal-tooltip="Sol" class="root">G</td>
            </tr>
          </tbody>
        </table>
        <table
          id="others"
          class="table table-bordered table-dark col-2"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="2">
                Others
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <!-- prettier-ignore -->
              <td class="variation" id="special-characters">
          <text id="disable-font-label">N.C.</text>
        </td>
              <td class="variation" id="special-characters">
                <text id="disable-font-label">??</text>
              </td>
            </tr>
          </tbody>
        </table>
        <table
          id="accidentals"
          class="table table-bordered table-dark col-2"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="3">
                Accidentals
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <td data-modal-tooltip="Sharp" class="accidental">+</td>
              <td data-modal-tooltip="Natural" class="accidental"></td>
              <!-- prettier-ignore -->
              <td data-modal-tooltip="Flat" class="accidental">&</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="row justify-content-center">
        <table
          id="variations"
          class="col-8 table table-bordered table-dark"
        >
          <thead>
            <tr>
              <th scope="col" class="text-center" colspan="17">
                Variations
              </th>
            </tr>
          </thead>
          <tbody class="Chords">
            <tr>
              <!-- prettier-ignore -->
              <td class="variation">c</td>
              <td class="variation">d</td>
              <td class="variation">e</td>

              <td class="variation">a</td>
              <td class="variation">b</td>
              <td class="variation">f</td>
              <td class="variation">h</td>
              <td class="variation">g</td>
              <td class="variation">i</td>
              <td class="variation">3</td>

              <td class="variation">@</td>

              <td class="variation">&gt;</td>
              <td class="variation">8</td>
              <td class="variation">W</td>
              <td class="variation">X</td>
              <td class="variation">Y</td>
            </tr>

            <tr>
              <td class="variation">5</td>

              <td class="variation">7</td>
              <td class="variation">9</td>
              <td class="variation">Q</td>
              <td class="variation">U</td>

              <td class="variation">6</td>
              <td class="variation">k</td>
              <td class="variation">=</td>

              <td class="variation">j</td>
              <td class="variation">R</td>
              <td class="variation">Z</td>
              <td class="variation">%</td>

              <td class="variation">
                4<text id="disable-font-label">2</text>
              </td>
              <td class="variation">
                4<text id="disable-font-label">4</text>
              </td>
              <td class="variation">H</td>
              <td class="variation">[</td>
            </tr>

            <tr>
              <td class="variation">]</td>
              <td class="variation">&lt;</td>

              <td class="variation">V</td>
              <td class="variation">v</td>
              <td class="variation">w</td>

              <td class="variation">1</td>
              <td class="variation">z</td>
              <td class="variation">x</td>
              <td class="variation">y</td>

              <td class="variation">T</td>
              <td class="variation">n</td>
              <td class="variation">r</td>
              <td class="variation">2</td>
              <td class="variation">u</td>
              <td class="variation">o</td>
              <td class="variation">l</td>
            </tr>

            <tr>
              <td class="variation">?</td>
              <td class="variation">p</td>
              <td class="variation">q</td>
              <td class="variation">L</td>
              <td class="variation">J</td>
              <td class="variation">O</td>
              <td class="variation">M</td>
              <td class="variation">S</td>
              <td class="variation">s</td>
              <td class="variation">K</td>

              <td class="variation">P</td>
              <td class="variation">N</td>
              <td class="variation">t</td>

              <td class="variation">I</td>
              <td class="variation">0</td>
              <td class="variation">m</td>
            </tr>
            <tr></tr>
          </tbody>
        </table>
      </div>

      <div class="d-flex justify-content-end" style="
      padding-right: 150px;" >
        <button
          id="cancel-btn"
          class="btn btn-light btn-lg mx-3"
          data-dismiss="modal"
        >
          Cancel
        </button>
        <button
          id="apply-btn"
          class="btn btn-primary btn-lg"
          data-dismiss="modal"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</div>
<div class="modal-content bg-transparent border-0"></div>
</div>`;
